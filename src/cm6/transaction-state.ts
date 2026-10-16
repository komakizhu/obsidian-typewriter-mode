export interface TransactionLike {
  reconfigured?: boolean;
  userEvent?: string;
}

export interface TransactionState {
  allowedUserEvents: boolean | null;
  isReconfigured: boolean;
  isUserEvent: boolean;
}

export function inspectTransactionState(
  transactions: readonly TransactionLike[],
  isUserEventAllowed: (event: string) => boolean
): TransactionState {
  let isReconfigured = false;
  const userEvents: string[] = [];

  for (const transaction of transactions) {
    isReconfigured ||= transaction.reconfigured === true;
    if (transaction.userEvent !== undefined) {
      userEvents.push(transaction.userEvent);
    }
  }

  if (userEvents.length === 0) {
    return {
      isReconfigured,
      isUserEvent: false,
      allowedUserEvents: null,
    };
  }

  return {
    isReconfigured,
    isUserEvent: true,
    allowedUserEvents: userEvents.every(isUserEventAllowed),
  };
}
