const localIsoDate = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};

export const today = () => localIsoDate(new Date());

export const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return localIsoDate(date);
};
