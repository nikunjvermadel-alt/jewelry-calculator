# Jewelry Pricing Calculator - Multi-User Edition

A web-based jewelry pricing calculator where users can create accounts, save multiple projects, and collaborate on jewelry designs.

## Features

- **User Authentication**: Create accounts and securely log in
- **Project Management**: Create, save, and manage multiple pricing projects
- **Real-time Calculations**: Instant pricing estimates based on material costs, labor, and markups
- **Persistent Storage**: All projects are saved to a database
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite3
- **Authentication**: JWT (JSON Web Tokens), bcryptjs
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Security**: CORS, password hashing

## Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)

## Installation

1. **Clone or extract the project** to your desired location

2. **Install dependencies**:
```bash
npm install
```

3. **Create a `.env` file** (copy from `.env.example`):
```bash
cp .env.example .env
```

4. **Update `.env` with your settings** (especially `JWT_SECRET` in production):
```env
PORT=5000
JWT_SECRET=your-very-secure-random-key-here
NODE_ENV=development
```

## Running Locally

1. **Start the server**:
```bash
npm start
```

The server will run on `http://localhost:5000`

2. **Open in browser**:
Visit `http://localhost:5000` in your web browser

3. **Create an account**:
- Click "Create one" to sign up
- Enter a username, email, and password
- Start creating projects!

## Usage

### Creating an Account
1. Click "Create one" on the login screen
2. Enter your username, email, and password
3. Click "Create account"

### Creating a Project
1. After logging in, select "Create new project..." from the dropdown
2. Enter a project name when prompted
3. Enter your pricing information
4. Click "Save Project" to store it

### Managing Projects
- **Load Project**: Select from the project dropdown
- **Save Changes**: Click "Save Project" after making changes
- **Delete Project**: Select a project and click the "Delete" button
- **New Project**: Select "Create new project..." to start fresh

## Pricing Calculator Fields

- **Metal Type**: Select from Sterling Silver, 14K Gold, 18K Gold, 22K Gold, or Platinum
- **Volume & Weight**: Enter CAD volume or finished weight
- **Material Costs**: Metal price, stones, findings
- **Labor**: CAD design cost and bench/production labor
- **Overhead**: Studio overhead percentage
- **Markups**: Wholesale and retail markup percentages
- **Tax**: Sales tax percentage

## Deployment

### Deploying to Heroku

1. **Create a Heroku account** at https://www.heroku.com

2. **Install Heroku CLI**: https://devcenter.heroku.com/articles/heroku-cli

3. **Login to Heroku**:
```bash
heroku login
```

4. **Create a new Heroku app**:
```bash
heroku create your-app-name
```

5. **Set environment variables**:
```bash
heroku config:set JWT_SECRET=your-very-secure-random-key-here
heroku config:set NODE_ENV=production
```

6. **Deploy**:
```bash
git push heroku main
```

7. **Access your app**:
```bash
heroku open
```

### Deploying to Other Platforms

#### Railway
1. Push to GitHub
2. Connect GitHub repo to Railway
3. Add environment variables in Railway dashboard
4. Deploy

#### Render
1. Push to GitHub
2. Connect GitHub repo to Render
3. Create new Web Service
4. Set environment variables
5. Deploy

#### DigitalOcean / AWS / Azure
Follow platform-specific deployment guides, ensuring:
- Node.js is installed
- Environment variables are configured
- PORT is configurable
- SQLite database path is writable

## Security Notes

⚠️ **Important for Production**:

1. **Change JWT_SECRET**: Generate a strong random string
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

2. **Use HTTPS**: Always use HTTPS in production

3. **Database**: SQLite is suitable for small to medium deployments. For larger scale, consider PostgreSQL

4. **CORS**: Configure allowed origins in `server.js`

5. **Password Requirements**: Consider adding stronger password validation

6. **Rate Limiting**: Add rate limiting for API endpoints

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Log in
- `GET /api/auth/profile` - Get user profile

### Projects
- `GET /api/projects` - List all user projects
- `GET /api/projects/:projectId` - Get specific project
- `POST /api/projects` - Create new project
- `PUT /api/projects/:projectId` - Update project
- `DELETE /api/projects/:projectId` - Delete project

## Troubleshooting

### "Cannot find module"
```bash
npm install
```

### Database errors
Delete `jewelry.db` and restart the server to recreate the database

### CORS errors
Check that the frontend API_URL matches your server URL

### Port already in use
Change PORT in `.env` or kill the process using that port

## Support

For issues or questions:
1. Check the console for error messages
2. Verify environment variables are set correctly
3. Ensure Node.js and npm are updated
4. Clear browser cache and try again

## Future Enhancements

- [ ] Email verification
- [ ] Password reset functionality
- [ ] Project sharing between users
- [ ] Material library database
- [ ] Export projects as PDF
- [ ] Batch pricing for multiple items
- [ ] Real-time spot price integration
- [ ] Analytics and reporting
- [ ] Mobile app

## License

MIT License - Feel free to use and modify as needed.
