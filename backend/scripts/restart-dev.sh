#!/bin/bash
echo "Limpando porta 3001..."
kill -9 $(lsof -ti :3001) 2>/dev/null
sleep 1
echo "Reiniciando backend..."
pm2 restart backend
