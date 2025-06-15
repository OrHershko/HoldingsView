import firebase_admin
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from firebase_admin import auth, credentials
from sqlalchemy.orm import Session

from api.core.config import settings
from api.crud import crud_user
from api.db.session import SessionLocal
from api.models.user import User
from api.schemas.user import UserCreate

# Initialize Firebase Admin SDK
# The 'cred' object is created from the service account JSON stored in settings.
try:
    cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS)
    firebase_admin.initialize_app(cred)
except ValueError as e:
    # This can happen if the base64 string is invalid or not set.
    # We log an error or raise an exception to prevent the app from starting
    # with a non-functional auth system.
    print(f"Error initializing Firebase Admin SDK: {e}")
    # In a production scenario, you might want to raise a SystemExit
    # raise SystemExit(
    #     "Could not initialize Firebase Admin SDK. Check the "
    #     "FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 environment variable."
    # )


# OAuth2 scheme for extracting the Bearer token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


def get_db():
    """
    Dependency to get a database session.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> User:
    """
    FastAPI dependency to verify Firebase ID token and get the corresponding user.

    If the user does not exist in our database, it creates one.

    Args:
        db (Session): The database session.
        token (str): The Firebase ID token from the Authorization header.

    Returns:
        User: The SQLAlchemy User object.

    Raises:
        HTTPException: If the token is invalid or the user is inactive.
    """
    try:
        decoded_token = auth.verify_id_token(token)
        firebase_uid = decoded_token["uid"]
        email = decoded_token.get("email")

        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No email associated with Firebase account.",
            )

        # User exists in Firebase, now check our DB
        user_in = UserCreate(firebase_uid=firebase_uid, email=email)
        user = crud_user.get_or_create(db=db, obj_in=user_in)

        if not user.is_active:
            raise HTTPException(status_code=400, detail="Inactive user")

        return user

    except auth.InvalidIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except auth.ExpiredIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        # Catch any other Firebase or unforeseen errors
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not validate credentials: {e}",
        )