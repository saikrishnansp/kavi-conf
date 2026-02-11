from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlmodel import Session, select, or_
from typing import Annotated, List

from app.core.dbsession import get_session
from app.core.security import get_current_user
from app.db_models.user import User
from app.schema.auth import UserResponse

router = APIRouter()

@router.get("", response_model=List[UserResponse])
def read_users(
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(get_current_user)],
    search: str = Query(None, min_length=1),
    skip: int = 0,
    limit: int = 10,
):
    """
    Search for users by full name, email, or employee ID.
    If no search query is provided, returns a paginated list.
    """
    # Only admins can view the full employee directory
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to view employees",
        )

    statement = select(User)
    if search:
        search_filter = f"%{search}%"
        statement = statement.where(
            or_(
                User.full_name.ilike(search_filter),
                User.email.ilike(search_filter),
                User.employee_id.ilike(search_filter),
            )
        )
    
    # Apply pagination
    statement = statement.offset(skip).limit(limit)
    users = session.exec(statement).all()
    return users

@router.get("/count")
def read_users_count(
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Get the total count of registered users.
    """
    from sqlmodel import func
    statement = select(func.count()).select_from(User)
    count = session.exec(statement).one()
    return {"total_employees": count}
