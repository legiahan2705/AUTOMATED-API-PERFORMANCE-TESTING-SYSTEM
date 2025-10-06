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

**ACCOUNT FOR VIEWING**
- Email: jmlegiahan@gmail.com
- Password: 123

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
    "name": "Sample Project API Collection",
    "_postman_id": "12345678-abcd-efgh-ijkl-987654321000",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Get All Users",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "https://jsonplaceholder.typicode.com/users",
          "protocol": "https",
          "host": ["jsonplaceholder", "typicode", "com"],
          "path": ["users"]
        }
      },
      "event": [
        {
          "listen": "test",
          "script": {
            "exec": [
              "pm.test(\"Status code is 200\", function () {",
              "    pm.response.to.have.status(200);",
              "});",
              "pm.test(\"Response is an array\", function () {",
              "    var jsonData = pm.response.json();",
              "    pm.expect(Array.isArray(jsonData)).to.be.true;",
              "});"
            ],
            "type": "text/javascript"
          }
        }
      ]
    },
    {
      "name": "Get User By ID",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "https://jsonplaceholder.typicode.com/users/1",
          "protocol": "https",
          "host": ["jsonplaceholder", "typicode", "com"],
          "path": ["users", "1"]
        }
      },
      "event": [
        {
          "listen": "test",
          "script": {
            "exec": [
              "pm.test(\"Status code is 200\", function () {",
              "    pm.response.to.have.status(200);",
              "});",
              "pm.test(\"User has id=1\", function () {",
              "    var jsonData = pm.response.json();",
              "    pm.expect(jsonData.id).to.eql(1);",
              "});"
            ],
            "type": "text/javascript"
          }
        }
      ]
    },
    {
      "name": "Create New Post",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Content-Type", "value": "application/json" }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"title\": \"foo\",\n  \"body\": \"bar\",\n  \"userId\": 1\n}"
        },
        "url": {
          "raw": "https://jsonplaceholder.typicode.com/posts",
          "protocol": "https",
          "host": ["jsonplaceholder", "typicode", "com"],
          "path": ["posts"]
        }
      },
      "event": [
        {
          "listen": "test",
          "script": {
            "exec": [
              "pm.test(\"Status code is 201\", function () {",
              "    pm.response.to.have.status(201);",
              "});",
              "pm.test(\"Response contains title\", function () {",
              "    var jsonData = pm.response.json();",
              "    pm.expect(jsonData).to.have.property('title');",
              "});"
            ],
            "type": "text/javascript"
          }
        }
      ]
    },
    {
      "name": "Update Post",
      "request": {
        "method": "PUT",
        "header": [
          { "key": "Content-Type", "value": "application/json" }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"id\": 1,\n  \"title\": \"updated title\",\n  \"body\": \"updated body\",\n  \"userId\": 1\n}"
        },
        "url": {
          "raw": "https://jsonplaceholder.typicode.com/posts/1",
          "protocol": "https",
          "host": ["jsonplaceholder", "typicode", "com"],
          "path": ["posts", "1"]
        }
      },
      "event": [
        {
          "listen": "test",
          "script": {
            "exec": [
              "pm.test(\"Status code is 200\", function () {",
              "    pm.response.to.have.status(200);",
              "});",
              "pm.test(\"Title is updated\", function () {",
              "    var jsonData = pm.response.json();",
              "    pm.expect(jsonData.title).to.eql('updated title');",
              "});"
            ],
            "type": "text/javascript"
          }
        }
      ]
    },
    {
      "name": "Delete Post",
      "request": {
        "method": "DELETE",
        "header": [],
        "url": {
          "raw": "https://jsonplaceholder.typicode.com/posts/1",
          "protocol": "https",
          "host": ["jsonplaceholder", "typicode", "com"],
          "path": ["posts", "1"]
        }
      },
      "event": [
        {
          "listen": "test",
          "script": {
            "exec": [
              "pm.test(\"Status code is 200\", function () {",
              "    pm.response.to.have.status(200);",
              "});"
            ],
            "type": "text/javascript"
          }
        }
      ]
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

// Cấu hình test
export let options = {
  vus: 10,            // số user ảo
  duration: '30s',    // thời gian chạy test
  thresholds: {       // ngưỡng để đánh giá kết quả
    http_req_duration: ['p(95)<500'], // 95% request phải dưới 500ms
    http_req_failed: ['rate<0.01'],   // < 1% request bị fail
  },
};

export default function () {
  // Base URL (thay bằng API của bạn)
  const BASE_URL = 'https://jsonplaceholder.typicode.com';

  // 1️. GET request (lấy danh sách posts)
  let res = http.get(`${BASE_URL}/posts`);
  check(res, {
    'status 200': (r) => r.status === 200,
    'body not empty': (r) => r.body && r.body.length > 0,
  });

  sleep(1);

  // 2️. POST request (tạo mới 1 post)
  const payload = JSON.stringify({
    title: 'foo',
    body: 'bar',
    userId: 1,
  });

  const headers = { 'Content-Type': 'application/json' };

  res = http.post(`${BASE_URL}/posts`, payload, { headers });
  check(res, {
    'status 201': (r) => r.status === 201,
    'has id': (r) => JSON.parse(r.body).id !== undefined,
  });

  sleep(1);

  // 3️. PUT request (update post id=1)
  const updatePayload = JSON.stringify({
    id: 1,
    title: 'updated title',
    body: 'updated body',
    userId: 1,
  });

  res = http.put(`${BASE_URL}/posts/1`, updatePayload, { headers });
  check(res, {
    'status 200': (r) => r.status === 200,
  });

  sleep(1);

  // 4️. DELETE request (xóa post id=1)
  res = http.del(`${BASE_URL}/posts/1`);
  check(res, {
    'status 200 or 204': (r) => r.status === 200 || r.status === 204,
  });

  sleep(1);
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
  "apiUrl": "https://jsonplaceholder.typicode.com/posts",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json",
    "Authorization": "Bearer your-token-here"
  },
  "body": {
   "title": "foo",
   "body": "bar",
   "userId": 1
  },
  "vus": 5,
  "duration": "30s"
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
- Ensure test results contain sufficient data
- Verify internet connectivity

---

<div align="center">
  <h3>⭐ Star this repository if you found it helpful!</h3>
  <p><em>Last updated: September 2025</em></p>
  
</div>




