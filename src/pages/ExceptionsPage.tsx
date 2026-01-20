import React from 'react';
import { Helmet } from 'react-helmet-async';
import { ExceptionBoard } from '@/components/exceptions';

export default function ExceptionsPage() {
  return (
    <>
      <Helmet>
        <title>Exception Board | Bluecore</title>
      </Helmet>
      <div className="container mx-auto py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Exception Board</h1>
          <p className="text-muted-foreground">
            Monitor and resolve financial exceptions
          </p>
        </div>
        <ExceptionBoard />
      </div>
    </>
  );
}
