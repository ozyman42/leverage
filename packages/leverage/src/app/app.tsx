import styled from '@emotion/styled';

import { Route, Link } from 'react-router-dom';
import { LeverageCalculator } from './leverage-calculator';

const StyledApp = styled.div`
  th {
    background: orange;
    width: 100px;
  }
  th, td {
    padding: 10px;
  }
`;

// <Link to="/page-2">Click here for page 2.</Link>

export function App() {
  return (
    <StyledApp>
      <Route
        path="/"
        exact
        render={() => <LeverageCalculator />}
      />
      <Route
        path="/page-2"
        exact
        render={() => (
          <div>
            <Link to="/">Click here to go back to root page!</Link>
          </div>
        )}
      />
      {/* END: routes */}
    </StyledApp>
  );
}

export default App;
