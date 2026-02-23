# UptimeRobot Setup Guide

## Backend Health Check Endpoints

Your backend now has two health check endpoints:

1. **Health Check**: `https://sses-task-management-system.onrender.com/api/health`
2. **Ping**: `https://sses-task-management-system.onrender.com/api/ping`

## UptimeRobot Configuration

### Step 1: Create Account
1. Go to https://uptimerobot.com
2. Sign up for free account (50 monitors free)

### Step 2: Add Monitor
1. Click "Add New Monitor"
2. Configure:
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: SSES Task Manager Backend
   - **URL**: `https://sses-task-management-system.onrender.com/api/health`
   - **Monitoring Interval**: 5 minutes (free tier)
   - **Monitor Timeout**: 30 seconds
   - **HTTP Method**: GET

### Step 3: Alert Contacts (Optional)
1. Add email for downtime alerts
2. Configure notification settings

## How It Works

- UptimeRobot pings `/api/health` every 5 minutes
- This keeps Render backend awake
- Backend won't sleep due to inactivity
- Free Render tier limitation bypassed

## Test Endpoints

Test manually:
```bash
curl https://sses-task-management-system.onrender.com/api/health
```

Expected response:
```json
{
  "status": "OK",
  "message": "Server is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Alternative: Cron-Job.org

If you prefer cron-job.org:
1. Go to https://cron-job.org
2. Create free account
3. Add new cron job:
   - URL: `https://sses-task-management-system.onrender.com/api/health`
   - Interval: Every 5 minutes
   - Method: GET

## Notes

- Free Render tier sleeps after 15 minutes of inactivity
- UptimeRobot pings every 5 minutes keeps it awake
- No code changes needed in frontend
- Backend stays responsive 24/7
