# Test backend initialization
try:
    from app.main import app
    print("SUCCESS: FastAPI application loaded and imported cleanly without any error!")
except Exception as e:
    import traceback
    print("FAILED: Error importing application:")
    traceback.print_exc()
