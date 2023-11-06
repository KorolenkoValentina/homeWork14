
enum CurrencyTypesEnum {
  USD = 'usd',
  EUR = 'eur',
  UAH = 'uah',
}

interface IBankClient {
  readonly firstName: string;
  readonly lastName: string;
}

interface ICurrencyConversionStrategy {
  convert(amount: number, currency: CurrencyTypesEnum): number;
}

interface IObserver {
  update(observable: IObservable): void;
}

interface IObservable {
  attach(observer: IObserver): void;
  detach(observer: IObserver): void;
  notify(): void;
}

class CurrentRateConversionStrategy implements ICurrencyConversionStrategy {
  constructor(private exchangeRates: Record<CurrencyTypesEnum, number>) {}

  public convert(amount: number, currency: CurrencyTypesEnum): number {
    const rate = this.exchangeRates[currency];

    if (!rate) throw new Error(`Exchange rate not available for currency ${currency}`);

    return amount * rate;
  }
}

class FixedRateConversionStrategy implements ICurrencyConversionStrategy {
  constructor(private fixedRate: number) {}

  public convert(amount: number, currency: CurrencyTypesEnum): number {
    return amount * this.fixedRate;
  }
}

abstract class Observable implements IObservable {
  protected observers: IObserver[] = [];

  public attach(observer: IObserver): void {
    const isExist = this.observers.includes(observer);
    if (!isExist) this.observers.push(observer);
  }

  public detach(observer: IObserver): void {
    const observerIndex = this.observers.indexOf(observer);

    if (~observerIndex) this.observers.splice(observerIndex, 1);
  }

  public notify(): void {
    for (const observer of this.observers) {
      observer.update(this);
    }
  }
}

interface ITransaction {
  execute(): void;
  rollback(): void;
}

class Transaction implements ITransaction {
  private initialBalance: number;
  private newBalance: number;
  private executed: boolean = false;
  private reverted: boolean = false;

  constructor(private account: BankAccount, private amount: number, private currency: CurrencyTypesEnum) {
    this.initialBalance = account.balance;
    this.newBalance = this.initialBalance;
  }

  public execute(): void {
    if (this.executed) {
      throw new Error('Transaction has already been executed.');
    }

    this.account.withdraw(this.amount, this.currency);
    this.newBalance = this.account.balance;
    this.executed = true;
  }

  public rollback(): void {
    if (!this.executed) {
      throw new Error('Cannot rollback a transaction that has not been executed.');
    }

    if (this.reverted) {
      throw new Error('Transaction has already been reverted.');
    }

    const amountToDeposit = this.initialBalance - this.newBalance;
    this.account.deposite(amountToDeposit);
    this.reverted = true;
  }
}


class BankAccount extends Observable {
  private readonly currency: CurrencyTypesEnum;
  private readonly _number: number;
  private _balance :number;
  private _holder: IBankClient;
  private _conversionStrategy: ICurrencyConversionStrategy;
  private transactionsQueue: ITransaction[] = [];

  constructor(client: IBankClient, currency: CurrencyTypesEnum, conversionStrategy: ICurrencyConversionStrategy,initialBalance: number = 0) {
    super();
    this.currency = currency;
    this._holder = client;
    this._number = 1234343;
    this._conversionStrategy = conversionStrategy;
    this._balance = initialBalance;
  }

  public get number(): number {
    return this._number;
  }

  public get balance(): number {
    return this._balance;
  }

  public set conversionStrategy(strategy: ICurrencyConversionStrategy) {
    this._conversionStrategy = strategy;
  }

  public holder(): IBankClient {
    return this._holder;
  }

  public deposite(amount: number): void {
    this._balance += amount;
    this.notify();
  }

  public withdraw(amount: number, currency: CurrencyTypesEnum): void {
    const convertedAmount = this._conversionStrategy.convert(amount, currency);

    if (this._balance >= convertedAmount) {
      this._balance -= convertedAmount;
      this.notify();
      console.log(`Withdrawal successful. Remaining balance: ${this._balance}`);
    } else {
      console.log("Insufficient funds for withdrawal in the specified currency.");
    }
  }

  public queueTransaction(transaction: ITransaction): void {
    this.transactionsQueue.push(transaction);
  }

  public executeTransactions(): void {
    this.transactionsQueue.forEach(transaction => {
      transaction.execute();
    });
    this.transactionsQueue = [];
  }

  public rollbackTransactions(): void {
    while (this.transactionsQueue.length > 0) {
      const transaction = this.transactionsQueue.pop();
      if (transaction) {
        transaction.rollback();
      }
    }
  }
}

class Bank {
  private accounts: Map<IBankClient, BankAccount[]> = new Map();
  private static instance: Bank;

  private constructor() {}

  public static getInstance(): Bank {
    if (!Bank.instance) {
      Bank.instance = new Bank();
    }
    return Bank.instance;
  }

  public createAccount(client: IBankClient, currency: CurrencyTypesEnum, conversionStrategy: ICurrencyConversionStrategy, initialBalance: number = 0): BankAccount {
    let accounts = this.accounts.get(client);

    if (!accounts) {
      accounts = [];
      this.accounts.set(client, accounts);
    }

    const account = new BankAccount(client, currency, conversionStrategy,initialBalance);
    accounts.push(account);

    return account;
  }

  public closeAccount(account: BankAccount): void {
    for (const accounts of this.accounts.values()) {
      const index = accounts.indexOf(account);
      if (index !== -1) {
        accounts.splice(index, 1);
        return;
      }
    }
    throw new Error('Account not found in the bank');
  }

  public queueTransaction(account: BankAccount, transaction: ITransaction): void {
    account.queueTransaction(transaction);
  }

  public executeTransactionsIntheQueue (account: BankAccount): void {
    account.executeTransactions();
  }

  public rollbackTransactionsIntheQueue(account: BankAccount): void {
    account.rollbackTransactions();
  }
}

class SMSNotification implements IObserver {
  update(account: BankAccount): void {
    console.log(`SMS notification: Your account balance has chenged. Current balance: ${account.balance}`);
  }
}

class EmailNotification implements IObserver {
  update(account: BankAccount): void {
    console.log(`Email notification: Your account balance has chenged. Current balance: ${account.balance}`);
  }
}

class PushNotification implements IObserver {
  update(account: BankAccount): void {
    console.log(`Push notification: Your account balance has chenged. Current balance: ${account.balance}`);
  }
}

// Привідний код для використання функціоналу банку

const exchangeRates = {
  [CurrencyTypesEnum.USD]: 1.1,
  [CurrencyTypesEnum.EUR]: 0.9,
  [CurrencyTypesEnum.UAH]: 38,
};


const bank = Bank.getInstance();

const currentRateStrategy = new CurrentRateConversionStrategy(exchangeRates);
const fixedRateStrategy = new FixedRateConversionStrategy(0.5);

// Створення клієнта
const clientJohn = { firstName: 'John', lastName: 'Doe' };

// Створення рахунків для клієнта
const accountUSD = bank.createAccount(clientJohn, CurrencyTypesEnum.USD, currentRateStrategy, 1000);
const accountEUR = bank.createAccount(clientJohn, CurrencyTypesEnum.EUR, currentRateStrategy, 800);
const accountUAH = bank.createAccount(clientJohn, CurrencyTypesEnum.UAH, currentRateStrategy, 5000);

// Виконання операцій з рахунками
bank.queueTransaction(accountUSD, new Transaction(accountUSD, 500, CurrencyTypesEnum.USD));
bank.queueTransaction(accountEUR, new Transaction(accountEUR, 300, CurrencyTypesEnum.EUR));
bank.queueTransaction(accountUAH, new Transaction(accountUAH, 200, CurrencyTypesEnum.UAH));

bank.executeTransactionsIntheQueue(accountUSD);
bank.executeTransactionsIntheQueue(accountEUR);
bank.executeTransactionsIntheQueue(accountUAH);

const newTransaction = new Transaction(accountUSD, 200, CurrencyTypesEnum.USD);
bank.queueTransaction(accountUSD, newTransaction);
bank.executeTransactionsIntheQueue(accountUSD);
bank.rollbackTransactionsIntheQueue(accountUSD);

// Закриття банківського рахунку
bank.closeAccount(accountUSD);

console.log(`Current balance of USD account: ${accountUSD.balance}`);
console.log(`Current balance of EUR account: ${accountEUR.balance}`);
console.log(`Current balance of UAH account: ${accountUAH.balance}`);


// Приклад використання сповіщень
const smsNotification = new SMSNotification();
const emailNotification = new EmailNotification();
const pushNotification = new PushNotification();

accountUSD.attach(smsNotification);
accountUSD.attach(emailNotification);
accountUSD.attach(pushNotification);

accountUSD.deposite(500);
accountUSD.withdraw(100, CurrencyTypesEnum.USD);

accountUSD.detach(emailNotification);
accountUSD.detach(pushNotification);

accountUSD.conversionStrategy = fixedRateStrategy;
accountUSD.withdraw(100, CurrencyTypesEnum.UAH);
