'use client';

import GameTab from '../../tabs/GameTab';
import { useEventApp } from '../../../context/EventAppContext';

export default function GameRouteScreen() {
  const { user, drawing, drawResult, runLuckyDraw } = useEventApp();

  return (
    <GameTab user={user} drawing={drawing} drawResult={drawResult} onLuckyDraw={runLuckyDraw} />
  );
}
