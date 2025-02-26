import React from 'react';
import createTestInstance from '@magento/peregrine/lib/util/createTestInstance';

import PaymentMethods from '../paymentMethods';

import { usePaymentMethods } from '@magento/peregrine/lib/talons/CheckoutPage/PaymentInformation/usePaymentMethods';

jest.mock('../../../../classify');

jest.mock(
    '@magento/peregrine/lib/talons/CheckoutPage/PaymentInformation/usePaymentMethods'
);

jest.mock('../paymentMethodCollection', () => ({
    braintree: props => <mock-Braintree id={'BraintreeMockId'} {...props} />
}));

const defaultTalonProps = {
    availablePaymentMethods: [{ code: 'braintree' }],
    currentSelectedPaymentMethod: 'braintree',
    initialSelectedMethod: 'braintree',
    isLoading: false
};

const defaultProps = {
    onPaymentError: jest.fn(),
    onPaymentSuccess: jest.fn(),
    resetShouldSubmit: jest.fn(),
    shouldSubmit: false
};

test('renders null when loading', () => {
    usePaymentMethods.mockReturnValueOnce({
        ...defaultTalonProps,
        isLoading: true
    });

    const props = {
        ...defaultProps
    };

    const tree = createTestInstance(<PaymentMethods {...props} />);

    expect(tree.toJSON()).toMatchSnapshot();
});

test('should render no method if not selected', () => {
    usePaymentMethods.mockReturnValueOnce({
        ...defaultTalonProps,
        currentSelectedPaymentMethod: null
    });

    const tree = createTestInstance(<PaymentMethods {...defaultProps} />);

    expect(() => {
        tree.root.findByProps({ id: 'BraintreeMockId' });
    }).toThrow('No instances found with props: {"id":"BraintreeMockId"}');
});

test('should render CreditCard component if "braintree" is selected', () => {
    usePaymentMethods.mockReturnValueOnce({
        ...defaultTalonProps,
        currentSelectedPaymentMethod: 'braintree'
    });

    const tree = createTestInstance(<PaymentMethods {...defaultProps} />);

    expect(() => {
        tree.root.findByProps({ id: 'BraintreeMockId' });
    }).not.toThrow();
});
