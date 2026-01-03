#!/bin/bash

# Script to run database migrations

echo "Running database migrations..."

# Run migration 002
echo "Adding customer fields (address, phone, credit_limit, notes)..."
psql -h localhost -U postgres -d fuel_management -f src/migrations/002_add_customer_fields.sql

echo "Migrations completed successfully!"
