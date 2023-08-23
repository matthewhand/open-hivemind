#!/bin/bash
echo 'Running Troubleshooting Script...'
echo 'Node Version:'
node --version
echo 'NPM Version:'
npm --version
echo 'Current Directory:'
pwd
echo 'Listing Files:'
ls -al
echo 'Environment Variables:'
env
echo 'Network Connectivity (pinging Google DNS):'
ping -c 4 8.8.8.8
echo 'Running index.js...'
node index.js
