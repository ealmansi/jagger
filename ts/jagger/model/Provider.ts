/**
 *
 */
export interface Provider<Parameters extends any[], Type> {
  (...parameters: Parameters): Type;
}
