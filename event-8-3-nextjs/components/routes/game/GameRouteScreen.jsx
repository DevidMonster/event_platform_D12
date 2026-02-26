'use client';

import GameTab from '../../tabs/GameTab';
import { useEventApp } from '../../../context/EventAppContext';

export default function GameRouteScreen() {
  const { user } = useEventApp();

  return <GameTab user={user} />;
}
