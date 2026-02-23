from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from sqlmodel import Session, select
from typing import Annotated
from datetime import datetime, timedelta
import random
import traceback
from app.utils.logging import logger
from app.core.dbsession import get_session
from app.schema.auth import UserCreate, Token, UserResponse, UserUpdate, OTPRequest, OTPVerify
from app.api.v1.crud import user as user_crud
from app.core.security import create_access_token, get_current_user
from app.db_models.user import User
from app.db_models.booking import Booking
from app.db_models.room_hold import RoomHold
from app.db_models.enums import BookingStatus
from app.core.config import get_settings
from app.utils.tz import IST
from app.utils.rate_limit import rate_limit_auth
from app.utils.email import send_otp_email
from fastapi_sso.sso.google import GoogleSSO

settings = get_settings()

def get_google_sso() -> GoogleSSO:
    # CRITICAL FIX: Use the setting to ensure consistency
    # This prevents fastapi-sso from auto-detecting and potentially using 127.0.0.1
    redirect_uri = settings.GOOGLE_REDIRECT_URI
    
    return GoogleSSO(
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
        redirect_uri=redirect_uri,
        allow_insecure_http=True,  # Required for localhost development
        scope=["openid", "email", "profile", "https://www.googleapis.com/auth/calendar.events"]
    )

router = APIRouter(dependencies=[Depends(rate_limit_auth)])


@router.post(
    "/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED
)
def register(user_in: UserCreate, session: Annotated[Session, Depends(get_session)]):
    """
    Register a new user.
    """
    # Check if user already exists
    user = user_crud.get_user_by_email(session, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists",
        )

    # Check if employee_id already exists
    user_by_id = user_crud.get_user_by_employee_id(
        session, employee_id=user_in.employee_id
    )
    if user_by_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this Employee ID already exists",
        )

    # Create new user
    created_user = user_crud.create_user(session, user_create=user_in)
    return created_user


@router.post("/request-otp")
def request_otp(
    otp_in: OTPRequest, 
    session: Annotated[Session, Depends(get_session)],
    background_tasks: BackgroundTasks
):
    """
    Generate and "send" an OTP to the user's email.
    """
    user = user_crud.get_user_by_email(session, email=otp_in.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email. Please register first.",
        )

    # Generate 6-digit OTP
    otp_code = f"{random.randint(100000, 999999)}"
    user.otp_code = otp_code
    user.otp_expires_at = datetime.now(IST) + timedelta(minutes=5)

    session.add(user)
    session.commit()

    # SEND EMAIL in background
    background_tasks.add_task(send_otp_email, user.email, otp_code)

    return {"message": "OTP sent"}


@router.post("/verify-otp", response_model=Token)
def verify_otp(verify_in: OTPVerify, session: Annotated[Session, Depends(get_session)]):
    """
    Verify OTP and return access token.
    """
    user = user_crud.get_user_by_email(session, email=verify_in.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if not user.otp_code or user.otp_code != verify_in.otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP code",
        )

    # Ensure timezone safety when comparing database times
    expires_at = user.otp_expires_at
    if expires_at is not None:
        # If the database stripped the timezone, safely attach IST back to it
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=IST)

    if not expires_at or expires_at < datetime.now(IST):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP has expired. Please request a new one.",
        )

    # Valid OTP: Clear it and issue token
    user.otp_code = None
    user.otp_expires_at = None
    session.add(user)
    session.commit()

    access_token = create_access_token(subject=user.employee_id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_email": user.email,
    }


@router.get("/login/google")
async def google_login(
    sso: Annotated[GoogleSSO, Depends(get_google_sso)],
    access_type: str = "online",
    prompt: str = ""
):
    """
    Redirect to Google login page.
    """
    async with sso:
        return await sso.get_login_redirect(
            params={"prompt": prompt or "consent", "access_type": access_type or "offline"}
        )


@router.get("/callback/google")
async def google_callback(
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    sso: Annotated[GoogleSSO, Depends(get_google_sso)],
):
    """
    Handle Google login callback.
    """
    try:
        async with sso:
            user_sso = await sso.verify_and_process(request)
        
        if not user_sso:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google authentication failed"
            )
        
        # Check if user exists in database
        logger.info(f"Searching for user: {user_sso.email}")
        user = user_crud.get_user_by_email(session, email=user_sso.email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No account found. Please register with this email first."
            )
        
        # Save refresh token if provided
        if sso.refresh_token:
            user.google_refresh_token = sso.refresh_token
            session.add(user)
            session.commit()
            session.refresh(user)

        # Include the google access token in our internal JWT
        access_token = create_access_token(
            subject=user.employee_id, 
            google_access_token=sso.access_token
        )
        
        # Redirect to frontend with token
        from fastapi.responses import RedirectResponse
        # Use environment variable or default for frontend URL from settings
        frontend_url = settings.FRONTEND_URL 
        
        # Append tokens to fragment (#) so they are not sent to servers in subsequent requests 
        # and can be read by the frontend.
        # sso.access_token is set on the sso object after verify_and_process
        redirect_url = f"{frontend_url}/agenda#token={access_token}&google_token={sso.access_token}"
        return RedirectResponse(url=redirect_url)
    except Exception as e:
        logger.error(f"CRITICAL ERROR in google_callback: {str(e)}")
        traceback.print_exc()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication error: {str(e)}"
        )

@router.post("/logout")
def logout():
    """
    Logout the current user. 
    Note: Since we use stateless JWT, the client should discard the token.
    """
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: Annotated[User, Depends(get_current_user)]):
    """
    Get the current user's profile.
    """
    return current_user


@router.patch("/me", response_model=UserResponse)
def update_current_user_profile(
    user_in: UserUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    """
    Update the current user's profile.
    """
    # Email Uniqueness Check (if email is changing)
    if user_in.email is not None and user_in.email != current_user.email:
        existing_user = user_crud.get_user_by_email(session, email=user_in.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

    # Security: Prevent non-admins from changing position (Privilege Escalation)
    if user_in.position is not None and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can update job positions.",
        )

    updated_user = user_crud.update_user(session, current_user, user_in)
    return updated_user


@router.get("/user/{email}", response_model=UserResponse)
def get_user_by_email(
    email: str,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    """
    Fetch user details by email.
    If the email is not the current user's, requires admin privileges.
    """
    # Permission Check: Only allow if current_user is admin or fetching themselves
    if email != current_user.email and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions"
        )

    # Fetch user
    user = user_crud.get_user_by_email(session, email=email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user


@router.patch("/user/{employee_id}", response_model=UserResponse)
def update_user(
    employee_id: str,
    user_in: UserUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    """
    Update a user profile.
    A user can update their own profile, or an admin can update any user's profile.
    """
    # Permission Check: Self or Admin
    if employee_id != current_user.employee_id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to update this user",
        )

    # Fetch user to update
    user_to_update = user_crud.get_user_by_employee_id(session, employee_id=employee_id)
    if not user_to_update:
        raise HTTPException(status_code=404, detail="User not found")

    # Email Uniqueness Check (if email is changing)
    if user_in.email is not None and user_in.email != user_to_update.email:
        existing_user = user_crud.get_user_by_email(session, email=user_in.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

    # Security: Prevent non-admins from changing position (Privilege Escalation)
    if user_in.position is not None and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can update job positions.",
        )

    updated_user = user_crud.update_user(session, user_to_update, user_in)
    return updated_user


@router.delete("/user/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    employee_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    """
    Delete a user account.
    A user can delete themselves, or an admin can delete any user.
    """
    # Permission Check: Self or Admin
    if employee_id != current_user.employee_id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to delete this user",
        )

    # Check for active bookings
    active_bookings = session.exec(
        select(Booking).where(
            Booking.user_id == employee_id,
            Booking.status != BookingStatus.CANCELLED,
            Booking.status != BookingStatus.COMPLETED,
        )
    ).first()

    if active_bookings:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete user with active bookings. Please cancel them first.",
        )

    # Check for active room holds
    active_holds = session.exec(
        select(RoomHold).where(
            RoomHold.user_id == employee_id, RoomHold.expires_at > datetime.now(IST)
        )
    ).first()

    if active_holds:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete user with active room holds. Please wait for them to expire or complete the booking.",
        )

    success = user_crud.delete_user(session, employee_id=employee_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")

    return None