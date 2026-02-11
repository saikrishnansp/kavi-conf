def get_bookings_in_range(
    session: Session, start_time: datetime, end_time: datetime
) -> list[Booking]:
    statement = select(Booking).where(
        Booking.status == BookingStatus.CONFIRMED,
        Booking.end_time > start_time,
        Booking.start_time < end_time,
    )
    return session.exec(statement).all()
