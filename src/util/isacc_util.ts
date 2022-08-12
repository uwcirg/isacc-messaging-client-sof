export function birthdaysBetweenDates(programStart: Date, programEnd: Date, birthday: Date): Date[] {
    birthday.setFullYear(programStart.getFullYear());
    if (birthday < programStart) {
        birthday.setFullYear(birthday.getFullYear() + 1);
    }

    let birthdays = [];
    while (birthday < programEnd) {
        birthdays.push(birthday);
        birthday = new Date(birthday);
        birthday.setFullYear(birthday.getFullYear() + 1);
    }
    return birthdays;
}