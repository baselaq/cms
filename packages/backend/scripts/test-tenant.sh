#!/bin/bash

# Test script for tenant resolver
# Usage: ./scripts/test-tenant.sh [subdomain] [base_url]

SUBDOMAIN="${1:-club1}"
BASE_URL="${2:-http://localhost:3000}"

echo "🧪 Testing Tenant Resolver"
echo "Subdomain: ${SUBDOMAIN}"
echo "Base URL: ${BASE_URL}"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health check
echo "📋 Test 1: Health Check"
echo "─────────────────────────────────────"
RESPONSE=$(curl -s -w "\n%{http_code}" -H "Host: ${SUBDOMAIN}.localhost" "${BASE_URL}/test/health")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" -eq 200 ]; then
  echo -e "${GREEN}✅ PASS${NC} - Status: $HTTP_CODE"
  echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
else
  echo -e "${RED}❌ FAIL${NC} - Status: $HTTP_CODE"
  echo "$BODY"
fi
echo ""

# Test 2: Tenant info
echo "📋 Test 2: Get Tenant Info"
echo "─────────────────────────────────────"
RESPONSE=$(curl -s -w "\n%{http_code}" -H "Host: ${SUBDOMAIN}.localhost" "${BASE_URL}/test/info")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" -eq 200 ]; then
  echo -e "${GREEN}✅ PASS${NC} - Status: $HTTP_CODE"
  echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
else
  echo -e "${RED}❌ FAIL${NC} - Status: $HTTP_CODE"
  echo "$BODY"
fi
echo ""

# Test 3: Database query
echo "📋 Test 3: Execute Database Query"
echo "─────────────────────────────────────"
RESPONSE=$(curl -s -w "\n%{http_code}" -H "Host: ${SUBDOMAIN}.localhost" "${BASE_URL}/test/query")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" -eq 200 ]; then
  echo -e "${GREEN}✅ PASS${NC} - Status: $HTTP_CODE"
  echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
else
  echo -e "${RED}❌ FAIL${NC} - Status: $HTTP_CODE"
  echo "$BODY"
fi
echo ""

# Test 4: Connection metrics
echo "📋 Test 4: Get Connection Metrics"
echo "─────────────────────────────────────"
RESPONSE=$(curl -s -w "\n%{http_code}" -H "Host: ${SUBDOMAIN}.localhost" "${BASE_URL}/test/metrics")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" -eq 200 ]; then
  echo -e "${GREEN}✅ PASS${NC} - Status: $HTTP_CODE"
  echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
else
  echo -e "${RED}❌ FAIL${NC} - Status: $HTTP_CODE"
  echo "$BODY"
fi
echo ""

# Test 5: Invalid subdomain (should fail)
echo "📋 Test 5: Invalid Subdomain (should fail)"
echo "─────────────────────────────────────"
RESPONSE=$(curl -s -w "\n%{http_code}" -H "Host: invalid..subdomain.localhost" "${BASE_URL}/test/info")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" -eq 400 ]; then
  echo -e "${GREEN}✅ PASS${NC} - Correctly rejected invalid subdomain (400)"
  echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
else
  echo -e "${YELLOW}⚠️  UNEXPECTED${NC} - Expected 400, got $HTTP_CODE"
  echo "$BODY"
fi
echo ""

# Test 6: Non-existent tenant (should fail)
echo "📋 Test 6: Non-existent Tenant (should fail)"
echo "─────────────────────────────────────"
RESPONSE=$(curl -s -w "\n%{http_code}" -H "Host: nonexistent.localhost" "${BASE_URL}/test/info")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" -eq 404 ]; then
  echo -e "${GREEN}✅ PASS${NC} - Correctly handled non-existent tenant (404)"
  echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
else
  echo -e "${YELLOW}⚠️  UNEXPECTED${NC} - Expected 404, got $HTTP_CODE"
  echo "$BODY"
fi
echo ""

# Test 7: Cache test (make two requests, second should be faster)
echo "📋 Test 7: Cache Test (check logs for cache hit/miss)"
echo "─────────────────────────────────────"
echo "First request (should be cache miss)..."
curl -s -H "Host: ${SUBDOMAIN}.localhost" "${BASE_URL}/test/info" > /dev/null
echo "Second request (should be cache hit)..."
RESPONSE=$(curl -s -w "\n%{http_code}" -H "Host: ${SUBDOMAIN}.localhost" "${BASE_URL}/test/info")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" -eq 200 ]; then
  echo -e "${GREEN}✅ PASS${NC} - Both requests succeeded (check server logs for cache hit/miss)"
else
  echo -e "${RED}❌ FAIL${NC} - Second request failed"
fi
echo ""

echo "✨ Testing complete!"
echo ""
echo "💡 Tips:"
echo "   - Check server logs for detailed information"
echo "   - Verify cache behavior by checking 'cache: hit/miss' in logs"
echo "   - Monitor connection metrics over multiple requests"

