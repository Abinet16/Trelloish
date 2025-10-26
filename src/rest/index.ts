import { Router } from "express";
import authRouter from "./authRoutes";

const restRouter = Router();

restRouter.use("/auth", authRouter);
// Add other REST routes here if any

export default restRouter;
