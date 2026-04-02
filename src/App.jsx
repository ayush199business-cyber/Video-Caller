import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { Room } from './pages/Room';
import { WhiteboardPage } from './pages/WhiteboardPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:id" element={<Room />} />
        <Route path="/whiteboard/:id" element={<WhiteboardPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
