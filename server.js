const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Single State Object tracking the clinic line status
let clinicState = {
    avgConsultationTime: 15, // in minutes
    currentlyServing: null,
    waitingPatients: [],
    tokenCounter: 100 // Starting token tracker
};

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log(`🔌 A screen connected: ${socket.id}`);

    // Blast down the current live state on connection
    socket.emit('stateUpdate', clinicState);

    // Operation A: Receptionist issues a new token string
    socket.on('addPatient', (name) => {
        if (!name || !name.trim()) return; // Protection against empty inputs

        clinicState.tokenCounter++;
        const newPatient = {
            name: name.trim(),
            tokenNumber: clinicState.tokenCounter
        };
        clinicState.waitingPatients.push(newPatient);

        console.log(`➕ Added Patient: ${newPatient.name} (Token #${newPatient.tokenNumber})`);
        io.emit('stateUpdate', clinicState); // Broadcast sync out
    });

    // Operation B: Doctor or Receptionist triggers 'Call Next'
    socket.on('callNext', () => {
        if (clinicState.waitingPatients.length > 0) {
            clinicState.currentlyServing = clinicState.waitingPatients.shift();
            console.log(`📢 Now Serving: Token #${clinicState.currentlyServing.tokenNumber}`);
        } else {
            clinicState.currentlyServing = null;
            console.log('📢 Queue is now empty.');
        }
        io.emit('stateUpdate', clinicState); // Broadcast sync out
    });

    // Operation C: Change system calculations values
    socket.on('updateConfig', (mins) => {
        const parsedMins = Number(mins);

        // FIXED: Check explicitly for NaN or negative numbers instead of using '|| 15'
        if (!isNaN(parsedMins) && parsedMins >= 0) {
            clinicState.avgConsultationTime = parsedMins;
            console.log(`⚙️ Config Updated: Avg Consultation Time is now ${parsedMins} mins`);
            io.emit('stateUpdate', clinicState); // Broadcast sync out
        }
    });

    socket.on('disconnect', () => {
        console.log(`❌ A screen disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Queue Cure server running on http://localhost:${PORT}`);
});