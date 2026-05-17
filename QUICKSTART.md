# Quick Start Guide

Get your Jewelry Pricing Calculator running in 5 minutes!

## 1. Install Dependencies
```bash
npm install
```

## 2. Start the Server
```bash
npm start
```

You should see:
```
Connected to SQLite database
Server running on http://localhost:5000
```

## 3. Open in Browser
Visit: **http://localhost:5000**

## 4. Create Your Account
- Click "Create one" 
- Enter username, email, and password
- Click "Create account"

## 5. Start Using!
- Select "Create new project..."
- Enter your jewelry details
- Click "Save Project"

## That's it! 🎉

Your projects are automatically saved and you can access them anytime by logging in.

---

## Sharing with Others

To let others use your calculator:

### For Local Network:
```bash
# Find your computer's IP address
ipconfig getifaddr en0  # macOS
hostname -I  # Linux
ipconfig  # Windows
```

Share the URL: `http://YOUR_IP:5000`

### For the World:

Deploy to Heroku, Railway, Render, or another hosting platform.
See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

---

## Environment Variables

Optional customization in `.env`:
- `PORT`: Change default port (default: 5000)
- `JWT_SECRET`: Security key (auto-generated, change for production)

---

Need help? Check [DEPLOYMENT.md](DEPLOYMENT.md) for troubleshooting.
