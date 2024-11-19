import express from 'express';
import { criarReserva, consultarReservas, consultarReservaPorId, deletarReserva, editarReserva } from '../controllers/reservaController';

const router = express.Router();

router.post('/reservas', criarReserva);

router.get('/reservas', consultarReservas);

router.get('/reservas/:id', consultarReservaPorId);

router.delete('/reservas/:id', deletarReserva);

router.put('/reservas/:id', editarReserva);

export default router;
