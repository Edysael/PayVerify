package com.legaltechit.payverify.receiving

import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.receiveAsFlow

/** Aviso dentro del proceso: "llegó un pago, envíalo ya". Lo escucha ReceivingService. */
object SyncSignal {
    private val channel = Channel<Unit>(Channel.CONFLATED)
    val events: Flow<Unit> = channel.receiveAsFlow()
    fun trigger() { channel.trySend(Unit) }
}
