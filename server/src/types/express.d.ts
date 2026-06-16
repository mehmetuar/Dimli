declare global {
  namespace Express {
    interface User {
      id: string;
      username?: string;
      role?: string;
      adminRole?: string;
    }
  }
}

export {};
