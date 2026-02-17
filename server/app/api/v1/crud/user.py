from sqlmodel import Session, select
from app.db_models.user import User
from app.schema.auth import UserCreate, UserUpdate
from app.core.security import get_password_hash, verify_password
from typing import Optional


def get_user_by_email(session: Session, email: str) -> Optional[User]:
    statement = select(User).where(User.email == email)
    return session.exec(statement).first()


def get_users_by_name(session: Session, name: str) -> list[User]:
    statement = select(User).where(User.full_name == name)
    return session.exec(statement).all()


def get_user_by_employee_id(session: Session, employee_id: str) -> Optional[User]:
    statement = select(User).where(User.employee_id == employee_id)
    return session.exec(statement).first()


def create_user(session: Session, user_create: UserCreate, commit: bool = True) -> User:
    db_user = User(
        email=user_create.email,
        full_name=user_create.full_name,
        position=user_create.position,
        employee_id=user_create.employee_id,
    )
    session.add(db_user)
    if commit:
        session.commit()
        session.refresh(db_user)
    return db_user


def update_user(
    session: Session, db_user: User, user_in: UserUpdate, commit: bool = True
) -> User:
    update_data = user_in.model_dump(exclude_unset=True)
    db_user.sqlmodel_update(update_data)
    session.add(db_user)
    if commit:
        session.commit()
        session.refresh(db_user)
    return db_user


def delete_user(session: Session, employee_id: str, commit: bool = True) -> bool:
    """
    Deletes a user by their employee ID. Returns True if successful, False if not found.
    """
    db_user = get_user_by_employee_id(session, employee_id)
    if not db_user:
        return False
    session.delete(db_user)
    if commit:
        session.commit()
    return True
