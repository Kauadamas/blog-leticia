#!/bin/bash
set -e

# Install build tools required for better-sqlite3
apt-get update
apt-get install -y build-essential python3

# Install npm dependencies
npm install
