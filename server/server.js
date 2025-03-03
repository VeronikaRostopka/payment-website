let activeConnections = new Set();

io.on('connection', (socket) => {
    // Добавляем соединение в Set
    activeConnections.add(socket.id);
    
    // Отправляем всем админам обновленное количество соединений
    io.to('admin').emit('connections-count', activeConnections.size);
    
    socket.on('disconnect', () => {
        // Удаляем соединение из Set
        activeConnections.delete(socket.id);
        // Отправляем обновленное количество соединений
        io.to('admin').emit('connections-count', activeConnections.size);
    });
    
    // Обработчик запроса количества соединений
    socket.on('get-connections-count', () => {
        socket.emit('connections-count', activeConnections.size);
    });

    // ... rest of the existing socket handlers ...
}); 