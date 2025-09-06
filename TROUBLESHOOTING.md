# 🔧 ChaiDocChat Authentication Troubleshooting Guide

## 🚨 Current Issues & Solutions

### 1. **Sign Up Not Working**
**Problem**: Users can't create new accounts
**Solutions**:
- ✅ **Fixed**: Environment variables are now properly configured
- ✅ **Fixed**: Added proper error handling and loading states
- ✅ **Fixed**: Added Google OAuth as alternative

### 2. **Google Sign-In Not Showing**
**Problem**: Google sign-in button not visible or not working
**Solutions**:
- ✅ **Fixed**: Added Google OAuth buttons to both login and signup pages
- ⚠️ **Required**: Configure Google OAuth in Clerk Dashboard

## 🔧 **Required Clerk Configuration**

### **Step 1: Configure Google OAuth in Clerk Dashboard**

1. **Go to Clerk Dashboard**: https://dashboard.clerk.com
2. **Navigate to**: "User & Authentication" → "Social Connections"
3. **Enable Google**: Toggle on Google OAuth
4. **Configure OAuth**:
   - **Client ID**: Get from Google Cloud Console
   - **Client Secret**: Get from Google Cloud Console
   - **Redirect URLs**: 
     - `http://localhost:5173/sso-callback`
     - `http://localhost:3000/sso-callback` (for production)

### **Step 2: Google Cloud Console Setup**

1. **Go to**: https://console.cloud.google.com
2. **Create Project**: "ChaiDocChat" (or use existing)
3. **Enable APIs**: Google+ API, Google Identity API
4. **Create Credentials**: OAuth 2.0 Client ID
5. **Authorized Origins**:
   - `http://localhost:5173`
   - `http://localhost:3000`
6. **Authorized Redirect URIs**:
   - `https://your-clerk-domain.clerk.accounts.dev/v1/oauth_callback`

## 🧪 **Testing Steps**

### **1. Test Email/Password Sign Up**
```bash
# Open the app
open http://localhost:5173

# Try these test credentials:
Email: test@example.com
Password: testpassword123
```

### **2. Test Google Sign In**
```bash
# After configuring Google OAuth in Clerk:
# 1. Click "Continue with Google"
# 2. Complete Google OAuth flow
# 3. Should redirect back to app
```

### **3. Debug Information**
The app now shows debug information at the top of the login page:
- ✅ Publishable Key: Should show "Set"
- ✅ User Loaded: Should show "Yes"
- ✅ Sign In/Up Available: Should show "Yes"

## 🐛 **Common Issues & Fixes**

### **Issue 1: "Invalid publishable key"**
**Fix**: Check your `.env` file:
```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_cmVsYXRlZC1zZXJ2YWwtMzEuY2xlcmsuYWNjb3VudHMuZGV2JA
```

### **Issue 2: "Clerk not loaded"**
**Fix**: Restart the frontend:
```bash
pkill -f "vite"
npm run dev
```

### **Issue 3: "Google OAuth not working"**
**Fix**: 
1. Configure Google OAuth in Clerk Dashboard
2. Add proper redirect URLs
3. Test with a real Google account

### **Issue 4: "Sign up fails silently"**
**Fix**: Check browser console for errors:
1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for Clerk-related errors
4. Check Network tab for failed requests

## 🔍 **Debug Commands**

### **Check Environment Variables**
```bash
# Frontend
cat .env

# Backend  
cat backend/.env | grep CLERK
```

### **Check Server Status**
```bash
# Backend API
curl http://localhost:5001/api/health

# Frontend
curl http://localhost:5173
```

### **Check Clerk Configuration**
```bash
# Test with your publishable key
curl -H "Authorization: Bearer YOUR_PUBLISHABLE_KEY" \
  https://api.clerk.com/v1/instances
```

## 📱 **Test Credentials**

### **Email/Password (Test Mode)**
- `test@example.com` / `testpassword123`
- `demo@chaidoc.com` / `demopass456`
- `user@test.local` / `userpass789`

### **Google OAuth (After Configuration)**
- Use any valid Google account
- Will create user automatically in Clerk

## 🚀 **Next Steps**

1. **Configure Google OAuth** in Clerk Dashboard
2. **Test email/password** sign up
3. **Test Google sign in**
4. **Upload a document** and test chat
5. **Verify user data isolation**

## 📞 **Still Having Issues?**

1. **Check browser console** for JavaScript errors
2. **Check network tab** for failed API calls
3. **Verify Clerk keys** are correct
4. **Test with different browsers**
5. **Clear browser cache** and try again

The authentication system is now properly configured and should work with both email/password and Google OAuth (once configured in Clerk Dashboard).
