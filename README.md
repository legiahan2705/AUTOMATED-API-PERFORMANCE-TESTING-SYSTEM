# 🚀 Test Mate

<div align="center">
  <img src="https://img.shields.io/badge/Status-Active-brightgreen?style=for-the-badge" alt="Status">
</div>

<div align="center">
  <h3>🎯 Automated API & Performance Testing with AI-Powered Insights</h3>
  <p>A comprehensive testing platform that combines automation, performance testing, and AI analysis to streamline your QA workflow with intelligent recommendations and real-time monitoring.</p>
</div>

<div align="center">
  <a href="https://automated-api-performance-testing-s.vercel.app">
    <img src="https://img.shields.io/badge/🌐_Live_Demo-Visit_Now-4285f4?style=for-the-badge&logo=vercel" alt="Live Demo">
  </a>
</div>


## 🌟 Why Choose Test Mate?

<table>
<tr>
<td>

### 🤖 AI-Powered Analysis
Leverage Groq AI to automatically analyze test results, identify performance bottlenecks, and provide actionable optimization recommendations.

</td>
<td>

### ⚡ Performance at Scale
Built-in K6 integration for comprehensive load testing with real-time monitoring, detailed metrics, and scalable virtual user simulation.

</td>
</tr>
<tr>
<td>

### 📅 Smart Scheduling
Set up automated test runs with flexible cron-based scheduling options to maintain continuous quality assurance and monitoring.

</td>
<td>

### 📊 Visual Reports
Beautiful interactive charts and graphs powered by Chart.js make it easy to understand performance trends and identify issues.

</td>
</tr>
</table>

## ✨ Core Features

### 🔧 Testing Capabilities
- **📁 Postman Integration**: Seamlessly upload and execute Postman collections (v2.1)
- **🚄 K6 Performance Testing**: Support for both quick tests and custom JavaScript scripts
- **📈 Real-time Monitoring**: Live performance metrics during test execution
- **🎨 Interactive Analytics**: Dynamic charts with drill-down capabilities
- **📋 Multi-format Reports**: Export results in JSON, CSV, and PDF formats

### 🤖 AI & Automation
- **🧠 Intelligent Analysis**: AI-powered test result interpretation with actionable insights
- **⏰ Flexible Scheduling**: Cron-based automated test execution
- **📧 Smart Notifications**: Configurable email reports with failure alerts
- **📊 Trend Analysis**: Historical performance tracking with anomaly detection
- **🔍 Root Cause Analysis**: AI-assisted problem identification and solutions

### 🛠️ Enterprise Features
- **☁️ Cloud Storage**: Secure file storage with Google Cloud Storage integration
- **🗄️ PostgreSQL Backend**: Robust data persistence with advanced querying
- **🔐 Security First**: Enterprise-grade security with data encryption
- **🔌 API Integration**: RESTful APIs for third-party tool integration

## 🏗️ Technology Stack

<div align="center">

### Frontend
![Next.js](https://img.shields.io/badge/Next.js_14-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

### Backend
![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)

### Cloud & Deployment
![Google Cloud](https://img.shields.io/badge/Google_Cloud-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Render](https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)

### AI & Testing Tools
![Groq](https://img.shields.io/badge/Groq_AI-FF6B35?style=for-the-badge&logo=ai&logoColor=white)
![K6](https://img.shields.io/badge/K6-7D64FF?style=for-the-badge&logo=k6&logoColor=white)
![Newman](https://img.shields.io/badge/Newman-FF5733?style=for-the-badge&logo=postman&logoColor=white)

</div>


## 📖 Comprehensive Usage Guide

### 1. 📁 Postman Collection Testing

**Preparation:**
- Export your collection from Postman as **Collection v2.1 (recommended)**
- Ensure environment variables are defined within the collection
- Use standard ASCII characters in file names

**Steps:**
1. Navigate to **API Testing** section
2. Click **Upload Collection** and select your `.json` file
3. Configure any additional environment variables
4. Click **Run Tests** and monitor real-time results

**Example Collection Structure:**
```json
{
  "info": { 
    "name": "E-commerce API Test Suite",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Authentication",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/auth/login",
        "body": {
          "mode": "raw",
          "raw": "{\"email\":\"test@example.com\",\"password\":\"password123\"}"
        }
      }
    }
  ],
  "variable": [
    {
      "key": "base_url",
      "value": "https://api.example.com/v1"
    }
  ]
}
```

### 2. 🚄 K6 Performance Testing

**Preparation:**
- Create a valid K6 JavaScript file
- Test locally with `k6 run your-script.js`
- Include proper error handling and checks

**Steps:**
1. Go to **Performance Testing** section
2. Choose **Custom Script** option
3. Upload your `.js` file
4. Configure test parameters (VUs, duration, thresholds)
5. Execute and monitor performance metrics

**Example K6 Script:**
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
export let errorRate = new Rate('errors');

export let options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up
    { duration: '5m', target: 10 }, // Stay at 10 users
    { duration: '2m', target: 0 },  // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    errors: ['rate<0.1'], // Error rate under 10%
  },
};

export default function () {
  const response = http.get('https://api.example.com/products');
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'has products': (r) => JSON.parse(r.body).products.length > 0,
  }) || errorRate.add(1);
  
  sleep(Math.random() * 3 + 1); // Random sleep 1-4 seconds
}
```

### 3. ⚡ Quick Test Setup

**Configuration Options:**
- **API URL**: Target endpoint (required)
- **HTTP Method**: GET, POST, PUT, DELETE, PATCH
- **Headers**: JSON object for custom headers
- **Request Body**: JSON payload for POST/PUT requests
- **Virtual Users**: Concurrent user simulation (1-1000)
- **Duration**: Test duration (10s to 30m)

**Example Quick Test Configuration:**
```json
{
  "apiUrl": "https://api.example.com/users",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json",
    "Authorization": "Bearer your-token-here"
  },
  "body": {
    "name": "John Doe",
    "email": "john.doe@example.com",
    "role": "user"
  },
  "vus": 10,
  "duration": "60s"
}
```

### 4. 🤖 AI-Powered Analysis

**AI will return:**
- **Overview**: Pass/Fail/Warning based on the actual data.
- **Performance Analysis**: p95/p99/throughput, high latency, impact on user experience…
- **Recommendations**: Top action items for dev/QA
- **Action Checklist**: 5–7 specific items

**Manual Analysis:**
1. Click **Run AI Analysis** after any test completion
2. Review generated insights and recommendations
3. Track improvement metrics over time

### 5. 📅 Scheduled Testing

**Setup Process:**
1. Navigate to **Scheduled Tests** section
2. Choose your test type (Postman, K6, or Quick Test)
3. Configure cron expression for timing
4. Set up email notifications


## 🚨 Troubleshooting

### Common Issues

**❌ Postman Collection Upload Fails**
- Ensure collection is exported as v2.1 format
- Check for undefined environment variables
- Verify JSON syntax validity
- Remove special characters from file names

**❌ K6 Script Execution Error**
- Test script locally with K6 CLI first
- Check for syntax errors and missing imports
- Verify target URLs are accessible
- Ensure proper error handling in script

**❌ Quick Test Configuration Issues**
- Validate API URL format (include https://)
- Check JSON syntax in headers/body
- Ensure reasonable VU and duration values
- Verify API endpoint accessibility

**❌ AI Analysis Not Working**
- Check Groq API key validity
- Ensure test results contain sufficient data
- Verify internet connectivity
- Check API rate limits

---

<div align="center">
  <h3>⭐ Star this repository if you found it helpful!</h3>
  <p><em>Last updated: September 2025</em></p>
  
</div>
