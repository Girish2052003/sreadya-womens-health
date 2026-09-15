package com.sreva.health.sreva

import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Before
import org.junit.Test
import java.time.Instant
import java.time.ZoneId
import java.time.ZonedDateTime
import java.util.TimeZone

class ReminderWallClockTest {
    private lateinit var originalTimeZone: TimeZone
    private val helsinki = ZoneId.of("Europe/Helsinki")

    @Before
    fun setUp() {
        originalTimeZone = TimeZone.getDefault()
        TimeZone.setDefault(TimeZone.getTimeZone(helsinki))
    }

    @After
    fun tearDown() {
        TimeZone.setDefault(originalTimeZone)
    }

    @Test
    fun dailyReminderKeepsEightAmAcrossSpringDstChange() {
        val entry = ReminderEntry.fromTimestamp(
            id = "spring",
            kind = "medication",
            timestampMillis = ZonedDateTime.of(2026, 3, 28, 8, 0, 0, 0, helsinki)
                .toInstant()
                .toEpochMilli(),
            title = "Sreva",
            body = "You have a reminder.",
            repeatDaily = true,
            label = null,
        )
        val now = ZonedDateTime.of(2026, 3, 28, 9, 0, 0, 0, helsinki)
            .toInstant()
            .toEpochMilli()

        val scheduled = entry.scheduledEpochMillis(now)
        assertNotNull(scheduled)
        val local = Instant.ofEpochMilli(scheduled!!).atZone(helsinki)
        assertEquals(2026, local.year)
        assertEquals(3, local.monthValue)
        assertEquals(29, local.dayOfMonth)
        assertEquals(8, local.hour)
        assertEquals(0, local.minute)
    }

    @Test
    fun dailyReminderKeepsEightAmAcrossAutumnDstChange() {
        val entry = ReminderEntry.fromTimestamp(
            id = "autumn",
            kind = "medication",
            timestampMillis = ZonedDateTime.of(2026, 10, 24, 8, 0, 0, 0, helsinki)
                .toInstant()
                .toEpochMilli(),
            title = "Sreva",
            body = "You have a reminder.",
            repeatDaily = true,
            label = null,
        )
        val now = ZonedDateTime.of(2026, 10, 24, 9, 0, 0, 0, helsinki)
            .toInstant()
            .toEpochMilli()

        val scheduled = entry.scheduledEpochMillis(now)
        assertNotNull(scheduled)
        val local = Instant.ofEpochMilli(scheduled!!).atZone(helsinki)
        assertEquals(2026, local.year)
        assertEquals(10, local.monthValue)
        assertEquals(25, local.dayOfMonth)
        assertEquals(8, local.hour)
        assertEquals(0, local.minute)
    }

    @Test
    fun oneShotReminderPreservesStoredLocalCalendarFields() {
        val entry = ReminderEntry(
            id = "period",
            kind = "periodThreeDays",
            timestampMillis = 0,
            targetLocalYear = 2026,
            targetLocalMonth = 9,
            targetLocalDay = 17,
            targetLocalHour = 8,
            targetLocalMinute = 15,
            title = "Sreva",
            body = "You have a reminder.",
            repeatDaily = false,
            label = null,
        )
        val now = ZonedDateTime.of(2026, 9, 16, 12, 0, 0, 0, helsinki)
            .toInstant()
            .toEpochMilli()

        val scheduled = entry.scheduledEpochMillis(now)
        assertNotNull(scheduled)
        val local = Instant.ofEpochMilli(scheduled!!).atZone(helsinki)
        assertEquals(2026, local.year)
        assertEquals(9, local.monthValue)
        assertEquals(17, local.dayOfMonth)
        assertEquals(8, local.hour)
        assertEquals(15, local.minute)
    }
}
