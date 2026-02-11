#!/usr/bin/env python3
"""
Google OAuth 2.0 Debugging Script
This script will help identify exactly where the OAuth flow is failing.
"""

import os
import sys
import requests
import json
from pathlib import Path
from urllib.parse import urlencode

# ANSI color codes for better visibility
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_header(text):
    print(f"\n{BLUE}{'='*70}{RESET}")
    print(f"{BLUE}{text.center(70)}{RESET}")
    print(f"{BLUE}{'='*70}{RESET}\n")

def print_success(text):
    print(f"{GREEN}✓ {text}{RESET}")

def print_error(text):
    print(f"{RED}✗ {text}{RESET}")

def print_warning(text):
    print(f"{YELLOW}⚠ {text}{RESET}")

def print_info(text):
    print(f"  {text}")

# Step 1: Load and verify .env file
print_header("STEP 1: Environment File Check")

# Try to find .env file
env_paths = [
    Path.cwd() / ".env",
    Path.cwd() / "server" / ".env",
    Path(__file__).parent / ".env",
    Path(__file__).parent.parent / ".env",
]

env_file = None
for path in env_paths:
    if path.exists():
        env_file = path
        print_success(f"Found .env file at: {path}")
        break

if not env_file:
    print_error("Could not find .env file!")
    print_info("Searched in:")
    for path in env_paths:
        print_info(f"  - {path}")
    sys.exit(1)

# Read .env file
env_vars = {}
with open(env_file, 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            env_vars[key.strip()] = value.strip()

# Check required variables
required_vars = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI']
missing_vars = []

for var in required_vars:
    if var not in env_vars or not env_vars[var]:
        missing_vars.append(var)
        print_error(f"{var} is missing or empty")
    else:
        if var == 'GOOGLE_CLIENT_SECRET':
            masked = env_vars[var][:10] + '...' + env_vars[var][-4:]
            print_success(f"{var} = {masked} (length: {len(env_vars[var])})")
        else:
            print_success(f"{var} = {env_vars[var]}")

if missing_vars:
    print_error(f"\nMissing required variables: {', '.join(missing_vars)}")
    sys.exit(1)

# Step 2: Validate credential format
print_header("STEP 2: Credential Format Validation")

client_id = env_vars['GOOGLE_CLIENT_ID']
client_secret = env_vars['GOOGLE_CLIENT_SECRET']
redirect_uri = env_vars['GOOGLE_REDIRECT_URI']

# Check Client ID format
if client_id.endswith('.apps.googleusercontent.com'):
    print_success("Client ID format is valid")
else:
    print_error("Client ID should end with '.apps.googleusercontent.com'")

# Check Client Secret format
if client_secret.startswith('GOCSPX-'):
    print_success("Client Secret starts with 'GOCSPX-'")
    if len(client_secret) == 35:
        print_success(f"Client Secret length is correct (35 characters)")
    else:
        print_warning(f"Client Secret length is {len(client_secret)} (expected 35)")
else:
    print_error("Client Secret should start with 'GOCSPX-'")

# Check for hidden characters
if client_secret != client_secret.strip():
    print_error("Client Secret has leading/trailing whitespace!")
else:
    print_success("No leading/trailing whitespace in Client Secret")

# Check Redirect URI
if redirect_uri.startswith('http://localhost:8000') or redirect_uri.startswith('http://127.0.0.1:8000'):
    print_success(f"Redirect URI: {redirect_uri}")
else:
    print_warning(f"Redirect URI might not match server: {redirect_uri}")

# Step 3: Test Google's Discovery Endpoint
print_header("STEP 3: Google OpenID Configuration Test")

try:
    response = requests.get(
        'https://accounts.google.com/.well-known/openid-configuration',
        timeout=10
    )
    if response.status_code == 200:
        print_success("Successfully connected to Google's OpenID endpoint")
        config = response.json()
        print_info(f"Token endpoint: {config.get('token_endpoint')}")
        print_info(f"Authorization endpoint: {config.get('authorization_endpoint')}")
    else:
        print_error(f"Failed to fetch OpenID config: HTTP {response.status_code}")
except Exception as e:
    print_error(f"Network error connecting to Google: {str(e)}")
    sys.exit(1)

# Step 4: Simulate the token exchange (this will fail, but shows us the exact error)
print_header("STEP 4: Simulating Token Exchange")

print_info("This will attempt to exchange a dummy code for a token.")
print_info("It WILL fail, but the error message will tell us why.\n")

token_endpoint = "https://oauth2.googleapis.com/token"
dummy_code = "DUMMY_CODE_FOR_TESTING"

payload = {
    'code': dummy_code,
    'client_id': client_id,
    'client_secret': client_secret,
    'redirect_uri': redirect_uri,
    'grant_type': 'authorization_code'
}

print_info("Request payload (client_secret masked):")
masked_payload = payload.copy()
masked_payload['client_secret'] = client_secret[:10] + '...' + client_secret[-4:]
print_info(json.dumps(masked_payload, indent=2))

try:
    response = requests.post(
        token_endpoint,
        data=payload,
        headers={'Content-Type': 'application/x-www-form-urlencoded'},
        timeout=10
    )
    
    print_info(f"\nResponse Status: {response.status_code}")
    print_info(f"Response Headers: {dict(response.headers)}\n")
    
    try:
        error_data = response.json()
        print_info("Response Body:")
        print_info(json.dumps(error_data, indent=2))
        
        if response.status_code == 400 and error_data.get('error') == 'invalid_grant':
            print_success("\nThis is EXPECTED! The dummy code is invalid.")
            print_success("But this confirms your Client ID and Secret are CORRECT!")
            print_success("Your credentials are working properly.")
        elif response.status_code == 401 and error_data.get('error') == 'invalid_client':
            print_error("\nThis is the PROBLEM!")
            print_error("Google says your Client ID or Client Secret is WRONG.")
            print_error("Error: invalid_client - Unauthorized")
            print_warning("\nPossible reasons:")
            print_warning("1. Client Secret in .env doesn't match Google Console")
            print_warning("2. Client ID in .env doesn't match Google Console")
            print_warning("3. OAuth client was deleted/disabled in Google Console")
            print_warning("4. There's a typo in either credential")
            print_warning("\nAction needed: Generate a NEW Client Secret in Google Console")
        else:
            print_warning(f"\nUnexpected response: {error_data.get('error', 'unknown')}")
            
    except json.JSONDecodeError:
        print_error("Could not parse response as JSON")
        print_info(f"Raw response: {response.text}")
        
except Exception as e:
    print_error(f"Request failed: {str(e)}")

# Step 5: Check if redirect URI mismatch
print_header("STEP 5: Redirect URI Configuration Check")

print_info("Your .env has:")
print_info(f"  GOOGLE_REDIRECT_URI = {redirect_uri}")
print_info("\nYour Google Console should have BOTH of these:")
print_info("  1. http://localhost:8000/api/v1/auth/callback/google")
print_info("  2. http://127.0.0.1:8000/api/v1/auth/callback/google")
print_info("\nIf your server runs on 127.0.0.1 but .env says localhost (or vice versa),")
print_info("you'll get a redirect_uri_mismatch error.")

# Step 6: Generate test authorization URL
print_header("STEP 6: Test Authorization URL")

auth_params = {
    'client_id': client_id,
    'redirect_uri': redirect_uri,
    'response_type': 'code',
    'scope': 'openid email profile',
    'access_type': 'offline',
    'prompt': 'consent'
}

auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(auth_params)}"
print_info("If you want to test manually, visit this URL:")
print_info(f"\n{auth_url}\n")
print_info("After logging in, Google will redirect you with a 'code' parameter.")
print_info("If you get a redirect_uri_mismatch error, the redirect URI in Google Console")
print_info("doesn't match what's in your .env file.")

# Final Summary
print_header("DIAGNOSTIC SUMMARY")

print_info("If the test in STEP 4 showed 'invalid_client':")
print_info("  → Your Client Secret is wrong. Get a new one from Google Console.")
print_info("\nIf the test in STEP 4 showed 'invalid_grant':")
print_info("  → Your credentials are CORRECT! The issue is elsewhere.")
print_info("\nIf you get redirect_uri_mismatch when testing:")
print_info("  → Add both localhost:8000 and 127.0.0.1:8000 URIs to Google Console.")

print(f"\n{BLUE}{'='*70}{RESET}\n")