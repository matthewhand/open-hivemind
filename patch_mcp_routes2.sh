sed -i 's/error\.message/((error as any).message)/g' src/server/routes/mcp.ts
sed -i 's/error\.code/((error as any).code)/g' src/server/routes/mcp.ts
sed -i 's/error\.statusCode/((error as any).statusCode)/g' src/server/routes/mcp.ts
