# Jewelry Pricing Calculator - Multi-User Edition

A web-based jewelry pricing calculator where users can create accounts, save multiple projects, and manage their jewelry pricing estimates. Perfect for jewelry designers, makers, and studios.

## 🚀 Quick Start

```bash
npm install
npm start
```

Then open http://localhost:5000 in your browser.

**New here?** See [QUICKSTART.md](QUICKSTART.md) for a guided walkthrough.

## ✨ Features

✅ **User Accounts** - Create accounts and securely log in  
✅ **Project Management** - Save unlimited projects  
✅ **Real-time Calculations** - Instant pricing estimates  
✅ **Shareable** - Deploy and share with team or clients  
✅ **Responsive Design** - Works on desktop and mobile  
✅ **Secure** - Password hashing and JWT authentication  

## 📊 What You Can Calculate

- **Production Cost**: Materials + labor + overhead
- **Wholesale Price**: Production cost × wholesale markup
- **Retail Price**: Production cost × retail markup + tax
- **Profit Margin**: Retail price - production cost
- **Metal Calculations**: Volume to weight conversion

## 🛠️ Technology Stack

- **Backend**: Node.js + Express
- **Database**: SQLite3
- **Frontend**: HTML5 + CSS3 + JavaScript
- **Authentication**: JWT + bcryptjs

## 📖 Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Get started in 5 minutes
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Deploy to production

## 🌍 Share With Others

### Local Network
Share your computer's IP: `http://YOUR_IP:5000`

### Online
Deploy to Heroku, Railway, Render, or your own server.
See [DEPLOYMENT.md](DEPLOYMENT.md) for step-by-step instructions.

## 📱 Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## 🔒 Security

- Passwords are hashed with bcryptjs
- User authentication with JWT tokens
- CORS protection
- Environment-based secrets

**Production Note**: Update `JWT_SECRET` in `.env` before deploying.

## 🎯 Use Cases

- **Solo Makers**: Track pricing for your jewelry line
- **Studios**: Manage multiple designers' pricing
- **Sales Teams**: Calculate quotes for clients
- **Consultants**: Provide pricing guidance to makers
- **Learners**: Understand jewelry economics

## 🚀 Deployment Options

- **Heroku** - Free tier available
- **Railway** - Simple git push deployment
- **Render** - Zero-downtime deployments
- **VPS** - DigitalOcean, AWS, Azure, Linode
- **Docker** - Container support ready

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

## 💡 Tips

1. **Save often** - Your projects auto-save when you click "Save Project"
2. **Reuse templates** - Create a template project and duplicate it
3. **Team access** - Share your server URL with team members
4. **Mobile friendly** - Use on your phone while at the workbench

## 🐛 Troubleshooting

**Port already in use?**
```bash
# Change port in .env
PORT=3000
```

**Database corrupted?**
```bash
# Delete and restart to recreate
rm jewelry.db
npm start
```

**CORS errors?**
Make sure frontend and backend URLs match. See DEPLOYMENT.md.

## 🤝 Contributing

Found a bug? Have an idea? Feel free to improve this tool!

## 📄 License

MIT - Use and modify freely

---

**Need help?** Check the docs above or troubleshooting section in [DEPLOYMENT.md](DEPLOYMENT.md).
