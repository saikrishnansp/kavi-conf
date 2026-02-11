import sys
import os
from datetime import datetime, timezone, timedelta
import jwt

# Add the current directory to sys.path to allow importing from 'app'
sys.path.append(os.getcwd())

try:
    from app.core.security import create_access_token
    from app.core.config import get_settings
    
    settings = get_settings()
    
    # Mock data
    mock_user_id = "EMP123"
    mock_google_token = "ya29.mock_google_access_token_value"
    
    print(f"--- Testing Token Generation ---")
    
    # 1. Generate token with Google Access Token
    token = create_access_token(
        subject=mock_user_id,
        google_access_token=mock_google_token
    )
    
    print(f"Generated JWT: {token[:20]}...")
    
    # 2. Decode and Assert
    payload = jwt.decode(
        token, 
        settings.SECRET_KEY, 
        algorithms=[settings.ALGORITHM]
    )
    
    print(f"Decoded Payload: {payload}")
    
    assert payload["sub"] == mock_user_id, "Subject mismatch"
    assert payload["google_access_token"] == mock_google_token, "Google Token missing from payload"
    
    print("\nSUCCESS: google_access_token is correctly embedded in the JWT payload.")

    # 3. Test without google token
    token_no_g = create_access_token(subject=mock_user_id)
    payload_no_g = jwt.decode(token_no_g, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert "google_access_token" not in payload_no_g, "google_access_token should not be in payload if not provided"
    
    print("SUCCESS: Regular token generation remains unaffected.")

except ImportError as e:
    print(f"Import Error: {e}")
    print("Make sure you are running this from the 'server' directory and your virtualenv is active.")
except Exception as e:
    print(f"Error during verification: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
