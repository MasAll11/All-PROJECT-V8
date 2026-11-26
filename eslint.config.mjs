# See https://nextjs.org/docs/app/api-reference/config/eslint
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default [...nextVitals, ...nextTs];
