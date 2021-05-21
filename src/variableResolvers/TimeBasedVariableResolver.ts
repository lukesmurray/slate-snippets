import { Variable, VariableResolver } from '../snippetParser/snippetParser';

export class TimeBasedVariableResolver implements VariableResolver {
  private static readonly dayNames = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  private static readonly dayNamesShort = [
    'Sun',
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat',
  ];
  private static readonly monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  private static readonly monthNamesShort = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  resolve(variable: Variable): string | undefined {
    const { name } = variable;

    if (name === 'CURRENT_YEAR') {
      return String(new Date().getFullYear());
    } else if (name === 'CURRENT_YEAR_SHORT') {
      return String(new Date().getFullYear()).slice(-2);
    } else if (name === 'CURRENT_MONTH') {
      return String(new Date().getMonth().valueOf() + 1).padStart(2, '0');
    } else if (name === 'CURRENT_DATE') {
      return String(new Date().getDate().valueOf()).padStart(2, '0');
    } else if (name === 'CURRENT_HOUR') {
      return String(new Date().getHours().valueOf()).padStart(2, '0');
    } else if (name === 'CURRENT_MINUTE') {
      return String(new Date().getMinutes().valueOf()).padStart(2, '0');
    } else if (name === 'CURRENT_SECOND') {
      return String(new Date().getSeconds().valueOf()).padStart(2, '0');
    } else if (name === 'CURRENT_DAY_NAME') {
      return TimeBasedVariableResolver.dayNames[new Date().getDay()];
    } else if (name === 'CURRENT_DAY_NAME_SHORT') {
      return TimeBasedVariableResolver.dayNamesShort[new Date().getDay()];
    } else if (name === 'CURRENT_MONTH_NAME') {
      return TimeBasedVariableResolver.monthNames[new Date().getMonth()];
    } else if (name === 'CURRENT_MONTH_NAME_SHORT') {
      return TimeBasedVariableResolver.monthNamesShort[new Date().getMonth()];
    } else if (name === 'CURRENT_SECONDS_UNIX') {
      return String(Math.floor(Date.now() / 1000));
    }

    return undefined;
  }
}
