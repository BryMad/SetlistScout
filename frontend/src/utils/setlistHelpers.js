export const extractSetlistID = (listURL) => {
  const splitString = listURL.split("-");
  const setListID = splitString[splitString.length - 1].slice(0, -5);
  return setListID;
};
