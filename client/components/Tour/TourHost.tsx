import React from 'react';
import { useTour } from '../../services/tourStore';
import { useBootSplashDone } from '../../services/bootSplashStore';
import { TourOverlay } from './TourOverlay';
import { DemoChat } from './DemoChat';

// AppContent kökünde BİR KEZ mount edilir. Splash perdesi (z-[9999]) bitmeden
// hiçbir tur öğesi çizilmez; DemoChat yalnız Sahalar turunun sahte-sohbet
// fazında görünür (overlay z-[9990] > DemoChat z-[9980]).
export const TourHost: React.FC = () => {
    const tour = useTour();
    const bootSplashDone = useBootSplashDone();

    if (!tour.activeTour || !bootSplashDone) return null;

    return (
        <>
            {tour.demoPhase === 'demoChat' && <DemoChat />}
            <TourOverlay />
        </>
    );
};
