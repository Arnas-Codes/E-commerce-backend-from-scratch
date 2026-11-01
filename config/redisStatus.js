let redisAvailable = false;

export const setRedisAvailable = (status) => {
  redisAvailable = status;
};

export const isRedisAvailable = () => {
  return redisAvailable;
};