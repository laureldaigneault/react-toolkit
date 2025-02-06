import { cloneDeep, get } from 'lodash';
import {
  FC,
  ReactNode,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ZodObject } from 'zod';

// Context
export type FormCallbackArgs = {
  valid: boolean;
  errors: Record<string, string | null | undefined> | null | undefined;
  fields: Record<string, any>;
};
export type FormContextType = {
  hold?: boolean;
  fields: Record<string, FormFieldType>;
  registerField: (name: string, field: Partial<FormFieldType>, isArray?: boolean) => void;
  reregisterField: (name: string) => void;
  unregisterField: (name: string) => void;
  deleteField: (name: string) => void;
  updateField: (name: string, field: Partial<FormFieldType>) => void;
  validateForm: () => void;
  resetForm: () => void;
  touchForm: () => void;
  clearForm: () => void;
  submitForm: (submitHandler?: (args: FormCallbackArgs) => Promise<void>) => void;
  isFieldRegistered: (fieldName: string) => boolean;
  submitting: boolean;
  valid: boolean;
  errors?: Record<string, string | null | undefined> | null | undefined;
};
const defaultContext: FormContextType = {
  hold: false,
  fields: {},
  registerField: (a) => a,
  reregisterField: (b) => b,
  unregisterField: (c) => c,
  deleteField: (d) => d,
  updateField: (e) => e,
  validateForm: () => true,
  resetForm: () => true,
  touchForm: () => true,
  clearForm: () => true,
  submitForm: () => true,
  isFieldRegistered: (a) => !!a,
  submitting: false,
  valid: false,
  errors: undefined,
};
export const FormContext = createContext<FormContextType>(defaultContext);
// Types
export type FormProps = {
  initialValues?: any;
  initialTouched?: boolean;
  schema: ZodObject<any>;
  onSubmit?: (args: FormCallbackArgs) => Promise<void>;
  onChange?: (args: FormCallbackArgs) => void | Promise<void>;
  hold?: boolean;
  children: ReactNode | ((formContext: FormContextType) => ReactNode);
};
export type FormFieldType = {
  required: boolean;
  touched: boolean;
  originalValue: any;
  value: any;
  error: any;
  errorMessage: string | null;
  _registered: boolean;
  _item?: boolean;
};
export const useFormRef = () => useRef<FormContextType>(defaultContext);
export const useFormState = () => useContext<FormContextType>(FormContext);
/**
 * Form component that exposes a global form context.
 * Each nested Fields will register to it.
 * @param initialValues
 */
export const Form = forwardRef<any, FormProps>(
  ({ initialValues = {}, initialTouched, schema, onSubmit, onChange, hold, children }, parentRef) => {
    const [fields, setFields] = useState<Record<string, FormFieldType>>({});
    const [unregisteredErrors, setUnregisteredErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState<boolean>(false);
    /**
     * Registers a field into the form state. This method is typically
     * called from the Field component, on mount.
     */
    const registerField = useCallback(
      (name: string, field: Partial<FormFieldType> = {}, isArray = false) => {
        const fieldsToMerge: Record<string, FormFieldType> = {};

        if (isArray) {
          if (initialValues[name] && Array.isArray(initialValues[name])) {
            initialValues[name].forEach((item, index) => {
              fieldsToMerge[`${name}.${index}`] = {
                required: false,
                touched: !!item || initialTouched || false,
                value: item,
                originalValue: item,
                error: false,
                errorMessage: null,
                ...field,
                _registered: true,
                _item: true,
              };
            });
          }
        } else {
          let initialValue = initialValues[name];

          if (name.includes('.')) {
            const [listName, itemTheoreticalIndex] = name.split('.');
            const itemIndex = !isNaN(Number(itemTheoreticalIndex)) ? Number(itemTheoreticalIndex) : -1;
            if (initialValues[listName] && Array.isArray(initialValues[listName]) && itemIndex > -1) {
              initialValue = initialValues[listName]?.[itemIndex];
            }
          }
          fieldsToMerge[name] = {
            required: false,
            touched: !!initialValue || initialTouched || false,
            value: initialValue ?? undefined,
            originalValue: field.value ?? undefined,
            error: false,
            errorMessage: null,
            ...field,
            _registered: true,
            _item: name.includes('.'),
          };
        }
        setFields((_prev) => {
          return {
            ..._prev,
            ...fieldsToMerge,
          };
        });
      },
      [initialValues, initialTouched]
    );

    /**
     * Re-registers a previously registered field. The difference lies in the fact that it
     * will not set default values, it will only switch back the _registered flag to true.
     */
    const reregisterField = useCallback((name: string) => {
      setFields((_prev) => {
        return {
          ..._prev,
          [name]: {
            ...(_prev[name] || {}),
            _registered: true,
          },
        };
      });
    }, []);

    /**
     * Unregisters a field from the form state. This method is typically
     * called from the Field component, before unmounting.
     */
    const unregisterField = useCallback((name: string) => {
      setFields((_prev) => {
        return {
          ..._prev,
          [name]: {
            ...(_prev[name] || {}),
            _registered: false,
          },
        };
      });
    }, []);

    /**
     * Deletes a field from the form state entirely.
     */
    const deleteField = useCallback((name: string) => {
      setFields((_prev) => {
        const updatedPrev = { ..._prev };
        if (updatedPrev[name]) delete updatedPrev[name];
        return updatedPrev;
      });
    }, []);

    /**
     * Checks if a field is registered and returns a boolean value
     */
    const isFieldRegistered = useCallback(
      (name: string) => {
        return fields[name]?._registered === true;
      },
      [fields]
    );

    /**
     * Updates the data of a form field
     */
    const updateField = useCallback((name: string, field: Partial<FormFieldType> = {}) => {
      setFields((_prev) => {
        return {
          ..._prev,
          [name]: {
            ...(_prev[name] || {}),
            ...field,
          },
        };
      });
    }, []);

    /**
     * Check if form is valid, and returns result
     */
    const isFormValid = useCallback(
      (_fields: Record<string, FormFieldType> = {}) => {
        const errors = Object.entries(_fields).reduce(
          (acc, [k, v]) => {
            if (v.error) acc[k] = v.errorMessage;
            return acc;
          },
          {} as Record<string, string | null | undefined>
        );
        const valid = Object.keys(errors).length === 0;
        return {
          valid,
          errors: errors ? { ...errors, ...unregisteredErrors } : undefined,
        };
      },
      [unregisteredErrors]
    );

    /**
     * Validate the form
     */
    const validateForm = useCallback(
      (options: { touch?: boolean } = {}) => {
        const { touch } = options;
        const allRequiredFields: Record<string, true> = {};
        const flattenedFields = Object.entries(fields || {}).reduce(
          (acc, [k, v]) => {
            if (v._registered) {
              if (v.required) allRequiredFields[k] = true;
              if (k.includes('.')) {
                const [listName, itemTheoreticalIndex] = k.split('.');
                const itemIndex = !isNaN(Number(itemTheoreticalIndex)) ? Number(itemTheoreticalIndex) : 0;
                if (!acc[listName]) acc[listName] = [];
                acc[listName][itemIndex] = cloneDeep(v.value);
              } else {
                acc[k] = cloneDeep(v.value);
              }
            }
            return acc;
          },
          {} as Record<string, any>
        );

        // Testing schema
        const partialSchema = cloneDeep(schema.partial());
        const validationResult = partialSchema.merge(schema.required(allRequiredFields)).safeParse(flattenedFields);
        const erroredFieldKeys: Record<string, string> = {};
        if (!validationResult.success) {
          (validationResult.error.issues || []).forEach((issue) => {
            const { path, message } = issue;
            erroredFieldKeys[(path || []).join('.')] = message;
          });
        }

        const allHandledErrorKeys: string[] = [];
        const updatedFields = Object.entries(cloneDeep(fields)).reduce(
          (acc, [k, v]) => {
            allHandledErrorKeys.push(k);
            acc[k] = erroredFieldKeys[k]
              ? {
                  ...v,
                  error: true,
                  errorMessage: erroredFieldKeys[k],
                  ...(touch ? { touched: true } : {}),
                }
              : {
                  ...v,
                  error: false,
                  errorMessage: null,
                  ...(touch ? { touched: true } : {}),
                };
            return acc;
          },
          {} as Record<string, FormFieldType>
        );

        const unregisteredFieldErrors: Record<string, string> = {};
        Object.entries(erroredFieldKeys).forEach(([k, v]) => {
          if (allHandledErrorKeys.includes(k)) return;
          unregisteredFieldErrors[k] = v;
        });
        setUnregisteredErrors(unregisteredFieldErrors);
        setFields(updatedFields);
        const { valid, errors } = isFormValid(updatedFields);

        const simpleFields = Object.entries(updatedFields).reduce(
          (acc, [k, v]) => {
            if (k.includes('.')) {
              const [listName, itemTheoreticalIndex] = k.split('.');
              const itemIndex = !isNaN(Number(itemTheoreticalIndex)) ? Number(itemTheoreticalIndex) : 0;
              if (!acc[listName]) acc[listName] = [];
              acc[listName][itemIndex] = cloneDeep(v.value);
            } else {
              acc[k] = cloneDeep(v.value);
            }
            return acc;
          },
          {} as Record<string, any>
        );

        return {
          fields: simpleFields,
          valid,
          errors: errors ? { ...errors, ...unregisteredFieldErrors } : undefined,
        };
      },
      [schema, fields]
    );

    const touchForm = useCallback(() => {
      setFields((_prev) => {
        return Object.entries(_prev).reduce(
          (acc, [k, v]) => {
            acc[k] = {
              ...v,
              touched: true,
            };
            return acc;
          },
          {} as Record<string, FormFieldType>
        );
      });
    }, []);

    /**
     * Resets the form to it's original values, set via
     * the initialValues prop on mount
     */
    const resetForm = useCallback(() => {
      setFields((_prev) => {
        return Object.entries(_prev).reduce(
          (acc, [k, v]) => {
            acc[k] = {
              ...v,
              touched: !!v.originalValue,
              value: v.originalValue ?? undefined,
              error: false,
              errorMessage: null,
            };
            return acc;
          },
          {} as Record<string, FormFieldType>
        );
      });
    }, [initialValues]);

    /**
     * Clears the form by setting all field values to undefined,
     * touched to false and clearing all errors. Note that this
     * does not clear the originalValue property, so the form
     * can still be resetted after being cleared
     */
    const clearForm = useCallback(() => {
      setFields((_prev) => {
        return Object.entries(_prev).reduce(
          (acc, [k, v]) => {
            acc[k] = {
              ...v,
              touched: false,
              value: undefined,
              error: false,
              errorMessage: null,
            };
            return acc;
          },
          {} as Record<string, FormFieldType>
        );
      });
    }, [initialValues]);

    /**
     * Triggers the action of "submitting" the form, which involves:
     * 1. validating all fields
     * 2. setting all fields as "touched"
     * 3. returning "valid" and "errors" properties for easy access
     */
    const submitForm = useCallback(
      async (submitHandler?: (args: FormCallbackArgs) => void) => {
        if (submitting) {
          console.warn('Cannot submit a form while is it already submitting');
          return;
        }
        setSubmitting(true);
        const { valid, errors, fields: _fields } = validateForm({ touch: true });
        const handlerParams = {
          valid,
          errors,
          fields: _fields,
        };
        if (submitHandler) {
          await submitHandler(handlerParams);
        } else if (onSubmit) {
          await onSubmit(handlerParams);
        }

        setSubmitting(false);
      },
      [initialValues, submitting, onSubmit, validateForm]
    );

    /**
     * Memoized "valid" and "errors" property to make it
     * accessible on form context. This also conveniently triggers
     * the validation, so we don't need a separate useEffect
     */
    const { valid, errors } = useMemo(() => {
      const validateResponse = validateForm();
      if (onChange) onChange(validateResponse);
      return validateResponse;
    }, [JSON.stringify(fields || {})]);

    /**
     * Context value to pass to context provider
     * and parent ref
     */
    const contextValue = {
      hold,
      fields,
      registerField,
      reregisterField,
      unregisterField,
      deleteField,
      isFieldRegistered,
      updateField,
      validateForm,
      resetForm,
      touchForm,
      clearForm,
      submitForm,
      submitting,
      valid,
      errors,
    };

    /**
     * Validate form on change
     */
    useEffect(() => {
      if (parentRef) (parentRef as any).current = contextValue;
    }, [JSON.stringify(contextValue || {})]);

    return (
      <FormContext.Provider value={contextValue}>
        {typeof children === 'function' ? children(contextValue) : children}
      </FormContext.Provider>
    );
  }
);

// Context
export type FieldContextType = {
  setTouched: (touched: boolean) => void;
  setError: (error: boolean, message?: string) => void;
  setErrorMessage: (message?: string | null) => void;
  setValue: (value?: any | null) => void;
  intent?: string;
} & Partial<FormFieldType>;
export const FieldContext = createContext<FieldContextType>({
  setTouched: (a) => a,
  setError: (b) => b,
  setErrorMessage: (c) => c,
  setValue: (d) => d,
});
export const useField = () => useContext(FieldContext);
// Types
export type FieldProps = {
  name: string;
  children: ReactNode | (() => ReactNode);
  inline?: boolean;
  intent?: string;
  required?: boolean;
  style?: any;
  className?: string;
};

/**
 * Field component
 */
export const Field: FC<FieldProps> = ({ name, children, inline, intent, style = {}, className, ...fieldOptions }) => {
  const formCtx = useContext(FormContext);
  const { registerField, unregisterField, updateField, fields, isFieldRegistered, hold } = formCtx;
  const field = useMemo(() => fields[name], [fields, name]);

  useEffect(() => {
    if (hold || isFieldRegistered(name)) return;
    registerField(name, fieldOptions || {});
    return () => unregisterField(name);
  }, [hold]);

  useEffect(() => {
    if (!field || !field._registered || hold) return;
    updateField(name, fieldOptions || {});
  }, [hold, field?._registered, fieldOptions?.required]);

  /**
   * Sets a field's "touched" property
   */
  const setTouched = useCallback(
    (_touched: boolean) => {
      updateField(name, { touched: _touched });
    },
    [name]
  );

  /**
   * Sets a field's "error" property
   */
  const setError = useCallback(
    (_error: boolean, _errorMessage?: string) => {
      updateField(name, {
        error: _error,
        ...(_error ? (_errorMessage ? { errorMessage: _errorMessage } : {}) : { errorMessage: undefined }),
      });
    },
    [name]
  );

  /**
   * Sets a field's "errorMessage" property
   */
  const setErrorMessage = useCallback(
    (_errorMessage?: string | null) => {
      updateField(name, {
        errorMessage: _errorMessage || undefined,
      });
    },
    [name]
  );

  /**
   * Sets a field's "value" property
   */
  const setValue = useCallback(
    (_value?: any | null) => {
      updateField(name, { value: _value });
    },
    [name]
  );

  const contextValue = {
    setTouched,
    setError,
    setErrorMessage,
    setValue,
    intent,
    ...field,
    error: field?.error && field?.touched,
  };

  const computedChildren = useMemo(() => {
    if (typeof children === 'function') {
      return children();
    }
    return children;
  }, [children]);

  return (
    <FieldContext.Provider value={contextValue}>
      <div
        className={className}
        style={{
          display: 'flex',
          position: 'relative',
          flexDirection: inline ? 'row' : 'column',
          ...style,
        }}>
        {computedChildren}
      </div>
    </FieldContext.Provider>
  );
};

/**
 * HOC to tap into the callbacks and props of a component.
 */
type WithFieldFunctionType = <T>(
  C: FC<T & { context?: FieldContextType }>,
  config?: {
    map?: { value?: keyof T; onChange?: string; onFocus?: keyof T; onBlur?: keyof T; onClick?: keyof T };
  }
) => FC<T & { _isolated?: boolean }>;
export const withField: WithFieldFunctionType = (C, config = {}) => {
  const { map } = config;
  const {
    value: valueProp = 'value',
    onChange: _onChange = 'onChange',
    onFocus: onFocusProp = 'onFocus',
    onBlur: onBlurProp = 'onBlur',
    onClick: onClickProp = 'onClick',
  } = map || {};

  return (props) => {
    const field = useField();

    if (props._isolated) {
      return <C {...props} />;
    }
    const [_onChangePropWithPotentialIndex, ...onChangePath] = _onChange.split('>')[0].split('.');
    const [onChangeProp, onChangeArgIndex] = _onChangePropWithPotentialIndex.split(':');
    const [, caster] = _onChange.split('>') as [any, 'number'];
    const augmentedProps = {
      ...(props || {}),
      [onChangeProp]: (...args: any[]) => {
        (props as any)?.[onChangeProp]?.(...args);
        const argIndex = Number(onChangeArgIndex || 0) || 0;
        const valueFromHandler = onChangePath?.length ? get(args[argIndex], onChangePath.join('.')) : args[argIndex];
        let castedValue = valueFromHandler;
        if (caster === 'number')
          castedValue = valueFromHandler && !isNaN(Number(valueFromHandler)) ? Number(valueFromHandler) : undefined;
        field.setValue(castedValue);
        field.setTouched(true);
      },
      [onFocusProp]: (...args: any[]) => {
        (props as any)?.[onFocusProp]?.(...args);
        // ...
      },
      [onBlurProp]: (...args: any[]) => {
        (props as any)?.[onBlurProp]?.(...args);
        // ...
      },
      [onClickProp]: (...args: any[]) => {
        (props as any)?.[onClickProp]?.(...args);
        // ...
      },
      [valueProp]: (props as any)?.[valueProp] || field.value,
      error: (props as any)?.error || field.error,
      context: field,
    };
    return <C {...augmentedProps} />;
  };
};

/**
 * Field Array component
 */
export type FieldArrayProps = {
  name: string;
  children: (opts: {
    items: any[];
    listErrors?: string[];
    add: (item: any, index?: number) => void;
    remove: (itemId: number) => void;
  }) => ReactNode;
};
export const FieldArray: FC<FieldArrayProps> = ({ name, children }) => {
  const formCtx = useContext(FormContext);
  const { updateField, deleteField, registerField, fields, errors } = formCtx;

  useEffect(() => {
    registerField(name, {}, true);
  }, []);

  const computedArrayValue = useMemo(() => {
    const _val: any[] = [];
    Object.entries(fields).forEach(([k, v]) => {
      if (k.startsWith(name) && k.includes('.')) {
        const [_, index] = k.split('.');
        _val[Number(index)] = v;
      }
    });
    return _val;
  }, [name, fields]);
  const listErrors = useMemo(() => {
    return Object.entries(errors || {}).reduce((acc, [k, v]) => {
      if (k.startsWith(name) && v && !acc.includes(v)) acc.push(v);
      return acc;
    }, [] as string[]);
  }, [name, errors]);

  const addHandler = useCallback(
    (item: any) => {
      const indexedMap: Record<number, FormFieldType> = {};
      Object.entries(fields).forEach(([k, v]) => {
        if (k.startsWith(name) && k.includes('.')) {
          const [_, _index] = k.split('.');
          indexedMap[Number(_index)] = v;
        }
      });
      registerField(`${name}.${Object.keys(indexedMap).length}`, { value: item });
    },
    [name, fields, registerField]
  );

  const removeHandler = useCallback(
    (itemIndex: number) => {
      const indexedMap: Record<number, FormFieldType> = {};
      Object.entries(fields).forEach(([k, v]) => {
        if (k.startsWith(name) && k.includes('.')) {
          const [_, index] = k.split('.');
          indexedMap[Number(index)] = v;
        }
      });
      const _fields = cloneDeep(fields);
      for (let i = itemIndex; i < Object.keys(indexedMap).length - 1; i++) {
        updateField(`${name}.${i}`, _fields[`${name}.${i + 1}`]);
      }
      deleteField(`${name}.${Object.keys(indexedMap).length - 1}`);
    },
    [name, fields, updateField, deleteField]
  );

  return children({
    items: computedArrayValue,
    listErrors: listErrors?.length ? listErrors : undefined,
    add: addHandler,
    remove: removeHandler,
  });
};

/*

<EZProvider>
  ...
  const { Form, submitting... } = useForm('form-name');
  <Form>
    <Field />
    <FieldArray>
      {() => <Field />}
    </FieldArray>
  </Form
</EZProvider>


*/
