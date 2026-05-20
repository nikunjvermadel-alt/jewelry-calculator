# Jewelry Pricing Calculator

A public web-based jewelry pricing calculator. There is no login system. Projects are saved in the visitor's browser with `localStorage`.

## Features

- **No Login Required**: The calculator opens directly.
- **Local Project Saves**: Saved projects stay in the same browser/device.
- **Real-Time Calculations**: Estimate materials, labor, overhead, wholesale, retail, and profit.
- **Live Spot Pricing**: Pulls gold, silver, and platinum spot prices through the app server.
- **CAD Volume Support**: STL and mesh-based 3DM files can auto-fill volume when readable.
- **Responsive Design**: Works on desktop and mobile devices.

## Tech Stack

- **Backend**: Node.js, Express.js
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Storage**: Browser `localStorage`

## Running Locally

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Open:
```text
http://localhost:5000
```

If the app uses another port, use the URL shown in the terminal.

## Usage

### Creating a Project
1. Select **Create new project...** or click **+ New**.
2. Enter a project name.
3. Fill in the pricing information.
4. Click **Save Project**.

### Managing Projects
- **Load Project**: Select from the project dropdown.
- **Save Changes**: Click **Save Project** after making changes.
- **Delete Project**: Select a project and click **Delete**.
- **New Project**: Click **+ New** to start a saved estimate.

Saved projects are stored only in the current browser. Clearing browser data or switching devices will not carry them over.

## Deployment

### Render
1. Push to GitHub.
2. Connect the GitHub repo to Render.
3. Create a new Web Service.
4. Use:
```bash
npm install
npm start
```
5. Set optional environment variables:
```env
PORT=5000
NODE_ENV=production
```
6. Deploy.

No database, email sender, password reset, or admin token is required because login has been removed.

## API Endpoints

- `GET /api/metal-price/:symbol` - Returns live spot price for `XAU`, `XAG`, or `XPT`.

## Troubleshooting

### "Cannot find module"
```bash
npm install
```

### Port already in use
Change `PORT` in `.env` or kill the process using that port.

### Saved projects disappeared
Projects are stored in browser `localStorage`. They can disappear if browser data is cleared, if you use a private window, or if you switch to another device/browser.
