import styled from '@emotion/styled';

import { Route, Link } from 'react-router-dom';
import { LeverageCalculator } from './leverage-calculator';

const StyledApp = styled.div`
  table {
    border-collapse: collapse;
  }
  th {
    background: orange;
    width: 70px;
  }
  th, td {
    padding: 5px;
    border-left: 1px dotted black;
  }
  tr {
    border-top: 1px solid black
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
