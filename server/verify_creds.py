import sys
import os

# Add the current directory to sys.path to allow importing from 'app'
sys.path.append(os.getcwd())

try:
    from app.core.config import get_settings
    settings = get_settings()
    
    print(f"GOOGLE_CLIENT_ID: {repr(settings.GOOGLE_CLIENT_ID)}")
    print(f"GOOGLE_CLIENT_SECRET: {repr(settings.GOOGLE_CLIENT_SECRET)}")
    print(f"GOOGLE_REDIRECT_URI: {repr(settings.GOOGLE_REDIRECT_URI)}")
    
    # Check for specific issues
    if settings.GOOGLE_CLIENT_ID.strip() != settings.GOOGLE_CLIENT_ID:
        print("WARNING: GOOGLE_CLIENT_ID has leading/trailing whitespace!")
    if settings.GOOGLE_CLIENT_SECRET.strip() != settings.GOOGLE_CLIENT_SECRET:
        print("WARNING: GOOGLE_CLIENT_SECRET has leading/trailing whitespace!")
    if settings.GOOGLE_REDIRECT_URI.strip() != settings.GOOGLE_REDIRECT_URI:
        print("WARNING: GOOGLE_REDIRECT_URI has leading/trailing whitespace!")
        
except Exception as e:
    print(f"Error: {e}")
