package com.legaltechit.payverify.receiving

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class HeartbeatPolicyTest {
    @Test fun intervalStaysWellInsideServerWindow() {
        assertTrue(HeartbeatPolicy.INTERVAL_MS * 2 < HeartbeatPolicy.SERVER_ONLINE_WINDOW_MS)
    }
    @Test fun backoffGrowsButNeverPassesServerWindow() {
        assertEquals(HeartbeatPolicy.INTERVAL_MS, HeartbeatPolicy.delayAfter(0))
        assertEquals(30_000L, HeartbeatPolicy.delayAfter(1))
        assertEquals(60_000L, HeartbeatPolicy.delayAfter(2))
        for (n in 1..50) assertTrue(HeartbeatPolicy.delayAfter(n) <= HeartbeatPolicy.SERVER_ONLINE_WINDOW_MS)
    }
    @Test fun onlineAndDescription() {
        val now = 10_000_000L
        assertTrue(HeartbeatPolicy.isOnline(now - 60_000, now))
        assertFalse(HeartbeatPolicy.isOnline(now - 6 * 60_000, now))
        assertFalse(HeartbeatPolicy.isOnline(0, now))
        assertEquals("Aún sin conexión con PayVerify", HeartbeatPolicy.describe(0, now))
        assertEquals("Conectado a PayVerify hace un momento", HeartbeatPolicy.describe(now - 20_000, now))
        assertEquals("Conectado a PayVerify hace 3 min", HeartbeatPolicy.describe(now - 3 * 60_000, now))
    }
}
