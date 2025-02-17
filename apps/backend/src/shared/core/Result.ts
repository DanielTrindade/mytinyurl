export class Result<T> {
  public isSuccess: boolean;
  public isFailure: boolean;
  public error: string;
  private _value: T;

  private constructor(isSuccess: boolean, error?: string, value?: T) {
    if (isSuccess && error) {
      throw new Error("InvalidOperation: um resultado não pode ser bem sucessido e conter erros");
    }
    
    if (!isSuccess && !error) {
      throw new Error("InvalidOperation: Um resultado que falhou tem que conter mensagem de erro");
    }

    this.isSuccess = isSuccess;
    this.isFailure = !isSuccess;
    this.error = error!;
    this._value = value!;
  }

  public getValue(): T {
    if (!this.isSuccess) {
      throw new Error("Não pode recuperar o valor de um resultado errado. Use 'error' ao invés.");
    }

    return this._value;
  }

  public static ok<U>(value?: U): Result<U> {
    return new Result<U>(true, undefined, value);
  }

  public static fail<U>(error: string): Result<U> {
    return new Result<U>(false, error);
  }
}