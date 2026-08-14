declare namespace Express {
  export interface Request {
    requestId: string;
    identity?: import('../utils/owner').RequestIdentity;
    authSessionId?: string;
  }
}
