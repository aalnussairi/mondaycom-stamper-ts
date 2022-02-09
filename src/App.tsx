import React from 'react';
import { Button, TextField } from 'monday-ui-react-core';
import mondaySdk from 'monday-sdk-js';

import './App.css';

const monday = mondaySdk();

class App extends React.Component {
  state = {
    isLoading: true,
    loggedIn: false,
    emailColumn: false,
    itemId: '',
    currentGroup: '',
    signedInGroup: '',
    signedOutGroup: '',
    backgroundColor: '',
    boardId: '',
    username: '',
  };

  componentDidMount = async () => {
    monday.listen('settings', (res) => {
      if (res.data.emailColumn) {
        this.setState({
          emailColumn: Object.keys(res.data.emailColumn)[0],
        });
      }
      if (res.data.signedInGroup) {
        console.log(res.data.signedInGroup);
        this.setState({
          signedInGroup: res.data.signedInGroup,
        });
      }
      if (res.data.signedOutGroup) {
        console.log(res.data.signedOutGroup);
        this.setState({
          signedOutGroup: res.data.signedOutGroup,
        });
      }
      if (res.data.backgroundColor) {
        this.setState({
          backgroundColor: res.data.backgroundColor,
        });
      }
      this.setState({ isLoading: false });
    });
    monday.listen('context', (res) => {
      this.setState({ boardId: res.data.boardId });
    });
  };

  stamp = async () => {
    if (!this.state.username) {
      monday.execute('notice', {
        type: 'error',
        message: 'Please enter a username!',
        timeout: 5000,
      });
      return;
    }
    try {
      const query = `
        query
        items_by_column_values(
          $boardId: Int!,
          $columnId: String!,
          $columnValue: String!
        )
        {
          items_by_column_values(
            board_id: $boardId,
            column_id: $columnId,
            column_value: $columnValue
            ) {
              id
              group (){
                id
              }
            }
          }
        `;
      const variables = {
        boardId: this.state.boardId,
        columnId: this.state.emailColumn,
        columnValue: this.state.username,
      };
      const res = await monday.api(query, { variables });
      const foundUsernames = res.data.items_by_column_values;
      if (foundUsernames.length < 1) {
        monday.execute('notice', {
          type: 'error',
          message: 'Oops, Stamper could not find that username!',
          timeout: 5000,
        });
        return;
      }
      if (
        foundUsernames[0].group.id !== this.state.signedInGroup &&
        foundUsernames[0].group.id !== this.state.signedOutGroup
      ) {
        monday.execute('notice', {
          type: 'error',
          message:
            'Oops, this item is neither in the signed in or signed out group.',
          timeout: 5000,
        });
        return;
      }

      this.setState({
        itemId: parseInt(foundUsernames[0].id),
        currentGroup: foundUsernames[0].group.id,
      });
      const mutation = `
          mutation move_item_to_group(
            $itemId: Int!,
            $groupId: String!
          ){
            move_item_to_group (
              item_id: $itemId,
              group_id: $groupId
            ){
              id
            }
          }
        `;
      const mutationVariables = {
        itemId: this.state.itemId,
        groupId:
          foundUsernames[0].group.id === this.state.signedInGroup
            ? this.state.signedOutGroup
            : this.state.signedInGroup,
      };
      await monday.api(mutation, { variables: mutationVariables });
      monday.execute('notice', {
        type: 'success',
        message: 'Stamped!',
        timeout: 5000,
      });
    } catch (error) {
      monday.execute('notice', {
        type: 'error',
        message: 'Oops, an unknown error occured :(',
        timeout: 5000,
      });
    }
  };

  render = () => {
    if (this.state.isLoading) return <p>loading...</p>;
    if (!this.state.emailColumn)
      return <p>Please select User ID column in the settings</p>;
    if (!this.state.loggedIn)
      return (
        <div
          className="main"
          style={{
            backgroundColor: this.state.backgroundColor,
          }}
        >
          <div className="container">
            <TextField
              value={this.state.username}
              onChange={(value: string) => this.setState({ username: value })}
              placeholder="email@example.com"
              size={TextField.sizes.LARGE}
            />

            <Button onClick={this.stamp} size={Button.sizes.LARGE}>
              Stamp!
            </Button>
          </div>
        </div>
      );
  };
}

export default App;
