package com.sreadya.health.sreadya

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
            title = "Sreadya",
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
            title = "Sreadya",
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
            title = "Sreadya",
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

    @Test
    fun dailyReminderKeepsEightAmInEveryAvailableTimeZone() {
        for (zoneName in ZoneId.getAvailableZoneIds()) {
            val zone = ZoneId.of(zoneName)
            TimeZone.setDefault(TimeZone.getTimeZone(zone))
            val entry = ReminderEntry.fromTimestamp(
                id = "worldwide-$zoneName",
                kind = "medication",
                timestampMillis = ZonedDateTime.of(2026, 6, 15, 8, 0, 0, 0, zone)
                    .toInstant()
                    .toEpochMilli(),
                title = "Sreadya",
                body = "You have a reminder.",
                repeatDaily = true,
                label = null,
            )
            val now = ZonedDateTime.of(2026, 6, 15, 9, 0, 0, 0, zone)
                .toInstant()
                .toEpochMilli()

            val scheduled = entry.scheduledEpochMillis(now)
            assertNotNull("No schedule produced for $zoneName", scheduled)
            val local = Instant.ofEpochMilli(scheduled!!).atZone(zone)
            assertEquals("Wrong local hour for $zoneName", 8, local.hour)
            assertEquals("Wrong local minute for $zoneName", 0, local.minute)
        }
    }

    @Test
    fun oneShotReminderKeepsWallClockAfterTimeZoneChange() {
        TimeZone.setDefault(TimeZone.getTimeZone(helsinki))
        val entry = ReminderEntry.fromTimestamp(
            id = "travel",
            kind = "periodThreeDays",
            timestampMillis = ZonedDateTime.of(2026, 9, 17, 8, 15, 0, 0, helsinki)
                .toInstant()
                .toEpochMilli(),
            title = "Sreadya",
            body = "You have a reminder.",
            repeatDaily = false,
            label = null,
        )

        val destination = ZoneId.of("Asia/Kolkata")
        TimeZone.setDefault(TimeZone.getTimeZone(destination))
        val now = ZonedDateTime.of(2026, 9, 16, 12, 0, 0, 0, destination)
            .toInstant()
            .toEpochMilli()

        val scheduled = entry.scheduledEpochMillis(now)
        assertNotNull(scheduled)
        val local = Instant.ofEpochMilli(scheduled!!).atZone(destination)
        assertEquals(2026, local.year)
        assertEquals(9, local.monthValue)
        assertEquals(17, local.dayOfMonth)
        assertEquals(8, local.hour)
        assertEquals(15, local.minute)
    }
}
