#!/usr/bin/env node
import { program } from 'commander';
import fetch from 'node-fetch';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_URL = process.env.API_URL || 'http://localhost:9393/api';

// OpenAPI定義を読み込む
async function loadOpenAPI() {
  try {
    const openApiPath = path.join(__dirname, '..', 'api-server', 'generated', '@typespec', 'openapi3', 'openapi.json');
    const data = await fs.readFile(openApiPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(chalk.yellow('Warning: OpenAPI definition not found. Run "tg api build" first.'));
    return null;
  }
}

// APIリクエストを実行
async function callAPI(method, endpoint, data) {
  const url = `${API_URL}${endpoint}`;
  
  const options = {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };

  if (data && method !== 'GET' && method !== 'DELETE') {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const responseData = await response.text();
    
    if (response.status >= 400) {
      console.error(chalk.red(`Error: HTTP ${response.status}`));
    }
    
    try {
      const json = JSON.parse(responseData);
      console.log(JSON.stringify(json, null, 2));
    } catch {
      if (responseData) {
        console.log(responseData);
      }
    }
    
    if (response.status >= 400) {
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red(`Request failed: ${error.message}`));
    process.exit(1);
  }
}

// API情報を表示
async function showInfo() {
  const openapi = await loadOpenAPI();
  
  if (!openapi) {
    console.log('OpenAPI definition not found.');
    return;
  }
  
  console.log(chalk.bold('Available API Endpoints:\n'));
  
  const paths = openapi.paths || {};
  const endpoints = [];
  
  for (const [path, methods] of Object.entries(paths)) {
    for (const [method, details] of Object.entries(methods)) {
      if (method === 'parameters') continue;
      
      endpoints.push({
        method: method.toUpperCase(),
        path: path,
        summary: details.summary || '',
        parameters: details.parameters || [],
        requestBody: details.requestBody
      });
    }
  }
  
  endpoints.sort((a, b) => {
    if (a.path !== b.path) return a.path.localeCompare(b.path);
    return a.method.localeCompare(b.method);
  });
  
  for (const endpoint of endpoints) {
    console.log(chalk.green(`${endpoint.method} ${endpoint.path}`));
    if (endpoint.summary) {
      console.log(`  ${endpoint.summary}`);
    }
    
    const pathParams = endpoint.parameters.filter(p => p.in === 'path');
    if (pathParams.length > 0) {
      console.log(`  ${chalk.gray('Params:')} ${pathParams.map(p => p.name).join(', ')}`);
    }
    
    if (endpoint.requestBody) {
      const content = endpoint.requestBody.content || {};
      const schema = content['application/json']?.schema;
      if (schema) {
        if (schema.required && schema.required.length > 0) {
          console.log(`  ${chalk.gray('Required body fields:')} ${schema.required.join(', ')}`);
        }
        const properties = schema.properties || {};
        const optional = Object.keys(properties).filter(k => !schema.required?.includes(k));
        if (optional.length > 0) {
          console.log(`  ${chalk.gray('Optional body fields:')} ${optional.join(', ')}`);
        }
      }
    }
    console.log('');
  }
  
  console.log(chalk.bold('Usage:'));
  console.log('  api-client call GET /projects');
  console.log('  api-client call POST /projects/myproject/tasks \'{"name":"task1","description":"Test"}\'');
}

program
  .name('api-client')
  .description('Taskgraph API Client')
  .version('1.0.0');

program
  .command('info')
  .description('Show API endpoints information')
  .action(showInfo);

program
  .command('call <method> <endpoint> [data]')
  .description('Call an API endpoint')
  .action(async (method, endpoint, data) => {
    let parsedData = null;
    if (data) {
      try {
        parsedData = JSON.parse(data);
      } catch (error) {
        console.error(chalk.red('Invalid JSON data'));
        process.exit(1);
      }
    }
    await callAPI(method.toUpperCase(), endpoint, parsedData);
  });

program.parse();
