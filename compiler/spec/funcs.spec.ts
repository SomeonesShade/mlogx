/**
Copyright © <BalaM314>, 2022.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>.

Contains tests of all functions.
*/



import {
	Arg,
	arg, argToString, GAT, GenericArgs, isArgValidFor, isArgValidForType, isArgValidForValidator,
	isGenericArg, makeArg, typeofArg
} from "../src/args.js";
import { commands, compilerCommands, processCommands } from "../src/commands.js";
import {
	acceptsVariable, addNamespacesToLine, addNamespacesToVariable, addSourcesToCode,
	areAnyOfInputsAcceptedByType, cleanLine, getAllPossibleVariablesUsed, getCommandDefinition,
	getCommandDefinitions, getCompilerCommandDefinitions, getJumpLabel, getJumpLabelUsed,
	getParameters, getVariablesDefined, getVariablesUsed, isCommand, isInputAcceptedByAnyType, parseIcons,
	parsePreprocessorDirectives, prependFilenameToArg, range, removeComments, removeTrailingSpaces,
	removeUnusedJumps, replaceCompilerConstants, splitLineIntoArguments, splitLineOnSemicolons, transformCommand,
	transformVariables, typeIsAccepted
} from "../src/funcs.js";
import { hasElement, topForLoop } from "../src/stack_elements.js";
import { CompilerConst } from "../src/types.js";
import { commandErrOfType, makeForEl, makeIfEl, makeLine, makeNamespaceEl } from "./test_utils.js";


describe("templateFunction", () => {
	it("should ", () => {
		expect("functionThing").toEqual("functionThing");
	});
});

//#region argFunctions

const argTypeData: {
	correctTypes: [string, GAT][],
	wrongTypes: [string, GAT][],
	correctArgs: [string, Arg][],
	wrongArgs: [string, Arg][],
} = {
	correctTypes: [
		["@unit", "unit"],
		["@thisx", "number"],
		["@this", "building"],
		["greaterThanEq", "operandTest"],
		["-50.2", "number"],
		[`"amogus"`, "string"],
		["sussyFlarogus", "unit"],
		[`:number`, "ctype"],
		[`add`, "operandDouble"],
		[`cos`, "operandSingle"],
		["@green", "team"],
		["amogus", "team"],
	],
	wrongTypes: [
		["@unit", "building"],
		["@thisx", "operandTest"],
		["@this", "string"],
		["greaterThanEq", "buildingGroup"],
		["-50.2", "unit"],
		[`"amogus"`, "number"],
		[`:number`, "variable"],
	],
	correctArgs: [
		["amogus", makeArg("amogus", "amogus", false, false)],
		["x", makeArg("number")],
	],
	wrongArgs: [
		["item", makeArg("unit", "unit", false, false)],
		["sus", makeArg("amogus", "amogus", false, false)],
	]
};

describe("isGenericArg", () => {
	it("should determine if an arg is generic", () => {
		for(const genericArg of Object.keys(GenericArgs)){
			expect(isGenericArg(genericArg)).toBe(true);
		}
	});
});

describe("typeofArg", () => {
	it("should determine the type of an arg", () => {
		const args: [arg:string, expectedType:string][] = [
			["@unit", "unit"],
			["@thisx", "number"],
			["@this", "building"],
			["greaterThanEq", "operandTest"],
			["-50.2", "number"],
			[`"amogus"`, "string"],
			[`:number`, "ctype"],
			["@malis", "team"]
		];
		for(const [arg, expectedOutput] of args){
			expect(typeofArg(arg)).withContext(`${arg} should be of type ${expectedOutput}`).toBe(expectedOutput);
		}
	});
});

describe("isArgValidForType", () => {
	it("should determine if an arg is of specified type", () => {
		for(const [arg, expectedType] of argTypeData.correctTypes){
			expect(isArgValidForType(arg, expectedType)).withContext(`${arg} should be of type ${expectedType}`).toBe(true);
		}
	});
	it("should determine if an arg is not of specified type", () => {
		for(const [arg, unexpectedType] of argTypeData.wrongTypes){
			expect(isArgValidForType(arg, unexpectedType)).withContext(`${arg} should not be of type ${unexpectedType}`).toBe(false);
		}
	});
});

describe("isArgValidFor", () => {
	it("should determine if an arg is valid for an arg type", () => {
		for(const [arg, expectedType] of argTypeData.correctTypes){
			expect(isArgValidFor(arg, makeArg(expectedType))).withContext(`${arg} should be of type ${expectedType}`).toBe(true);
		}
	});
	it("should determine if an arg is not of specified type", () => {
		for(const [arg, unexpectedType] of argTypeData.wrongTypes){
			expect(isArgValidFor(arg, makeArg(unexpectedType))).withContext(`${arg} should not be of type ${unexpectedType}`).toBe(false);
		}
	});
	it("should determine if an arg is valid for an Arg", () => {
		for(const [str, correctArg] of argTypeData.correctArgs){
			expect(isArgValidFor(str, correctArg)).withContext(`${str} should be of type ${argToString(correctArg)}`).toBe(true);
		}
	});
	it("should determine if an arg is invalid for an Arg", () => {
		for(const [str, wrongArg] of argTypeData.wrongArgs){
			expect(isArgValidFor(str, wrongArg)).withContext(`${str} should not be of type ${argToString(wrongArg)}`).toBe(false);
		}
	});
});

describe("isArgValidForValidator", () => {
	it("should determine if an arg is valid for string array validators", () => {
		expect(isArgValidForValidator("amogus", ["amogus"])).toBe(true);
		expect(isArgValidForValidator("sus", ["su", "amog", "imposter"])).toBe(false);
		expect(isArgValidForValidator("su", ["su", "amog", "imposter"])).toBe(true);
	});
	it("should determine if an arg is valid for regexp array validators", () => {
		expect(isArgValidForValidator("amog5us", [/amog\dus/])).toBe(true);
		expect(isArgValidForValidator("amogeus", [/amog us/, /amog\dus/])).toBe(false);
	});
});

//#endregion
//#region lineManipulation

describe("removeTrailingSpaces", () => {
	it("should remove trailing and leading spaces and tabs", () => {
		expect(removeTrailingSpaces("    set x 5")).toBe("set x 5");
		expect(removeTrailingSpaces("set x 5  ")).toBe("set x 5");
		expect(removeTrailingSpaces("\tset x 5")).toBe("set x 5");
		expect(removeTrailingSpaces(" \tset x 5\t ")).toBe("set x 5");
	});
});

describe("removeComments", () => {
	it("should remove single line comments", () => {
		expect(removeComments("amogus sussy //comment")).toBe("amogus sussy ");
		expect(removeComments("amogus sussy #comment")).toBe("amogus sussy ");
		expect(removeComments("//comment")).toBe("");
		expect(removeComments("amogus sussy#//#comment")).toBe("amogus sussy");
	});
	it("should remove multiline comments", () => {
		expect(removeComments("amogus /*COMMENT*/sus")).toBe("amogus sus");
		expect(removeComments("amogus /*com*/sus/*ent*/ ")).toBe("amogus sus ");
	});
	it("should not mess up comments inside of strings", () => {
		expect(removeComments(`print "[#blue]amogus[]"`)).toBe(`print "[#blue]amogus[]"`);
		expect(removeComments(`print "amo//gus"`)).toBe(`print "amo//gus"`);
		expect(removeComments(`print "am/*og*/us"`)).toBe(`print "am/*og*/us"`);
		expect(removeComments(`print /*"a#m*/ogus ""`)).toBe(`print ogus ""`);
	});
});

describe("cleanLine", () => {
	it("should not modify lines that are already clean", () => {
		expect(cleanLine("set x 5")).toBe("set x 5");
		expect(cleanLine("ulocate building core true outX outY found building")).toBe("ulocate building core true outX outY found building");
	});
	it("should remove trailing and leading spaces and tabs", () => {
		expect(cleanLine("    set x 5")).toBe("set x 5");
		expect(cleanLine("set x 5  ")).toBe("set x 5");
		expect(cleanLine("\tset x 5")).toBe("set x 5");
		expect(cleanLine(" \tset x 5\t ")).toBe("set x 5");
	});
	it("should remove single line comments", () => {
		expect(cleanLine("amogus sussy //comment")).toBe("amogus sussy");
		expect(cleanLine("amogus sussy #comment")).toBe("amogus sussy");
		expect(cleanLine("//comment")).toBe("");
		expect(cleanLine("amogus sussy#//#comment")).toBe("amogus sussy");
	});
	it("should remove multiline comments", () => {
		expect(cleanLine("amogus /*COMMENT*/sus")).toBe("amogus sus");
		expect(cleanLine("amogus /*com*/sus/*ent*/ ")).toBe("amogus sus");
	});
	it("should not mess up comments inside of strings", () => {
		expect(cleanLine(`print "[#blue]amogus[]"`)).toBe(`print "[#blue]amogus[]"`);
		expect(cleanLine(`print "amo//gus"`)).toBe(`print "amo//gus"`);
		expect(cleanLine(`print "am/*og*/us"`)).toBe(`print "am/*og*/us"`);
		expect(cleanLine(`print /*"a#m*/ogus ""`)).toBe(`print ogus ""`);
	});
	it("should do everything above at once", () => {
		expect(cleanLine(`   \t say amogus /*#"a*/nd""#     \t\t  `)).toBe(`say amogus nd""`);
	});
});

describe("replaceCompilerConstants", () => {
	const sampleVars = new Map<string, CompilerConst>([
		["mog", "amogus"],
		["e", "building core true"],
		["err", "thingy"],
		["memcellpos.mode", "5"],
		["number", 50.2],
		["boolean", true],
		["array", [50.2, true, "e"]],
	]);
	it("should not modify lines without compiler constants", () => {
		expect(replaceCompilerConstants(`print "x + 5 is $amogus"`, sampleVars)).toBe(`print "x + 5 is $amogus"`);
	});
	it("should replace compiler constants", () => {
		expect(replaceCompilerConstants(`print "$mog"`, sampleVars)).toBe(`print "amogus"`);
		expect(replaceCompilerConstants(`write x cell1 $memcellpos.mode`, sampleVars)).toBe(`write x cell1 5`);
		expect(replaceCompilerConstants(`print "$err"`, sampleVars)).toBe(`print "building core truerr"`);
	});
	it("should replace non-string compiler consts", () => {
		expect(replaceCompilerConstants(`print $number`, sampleVars)).toBe(`print 50.2`);
		expect(replaceCompilerConstants(`print $boolean`, sampleVars)).toBe(`print true`);
		expect(replaceCompilerConstants(`print "$array"`, sampleVars)).toBe(`print "50.2 true e"`);
	});
	it("should replace compiler constants when parentheses are used", () => {
		expect(replaceCompilerConstants(`print "$(mog)"`, sampleVars)).toBe(`print "amogus"`);
		expect(replaceCompilerConstants(`print "$(err)"`, sampleVars)).toBe(`print "thingy"`);
		expect(replaceCompilerConstants(`print "$(e)rr"`, sampleVars)).toBe(`print "building core truerr"`);
	});
});

describe("splitLineIntoArguments", () => {
	it("should split a line on space", () => {
		expect(splitLineIntoArguments("a b cd e")).toEqual(["a", "b", "cd", "e"]);
		expect(splitLineIntoArguments("ulocate building core true outX outY found building")).toEqual(["ulocate", "building", "core", "true", "outX", "outY", "found", "building"]);
	});
	it("should not split strings", () => {
		expect(splitLineIntoArguments(`print "amogus sussy" and "a eea "`)).toEqual(["print", `"amogus sussy"`, "and", `"a eea "`]);
	});
	it("should throw an error on unterminated string literals", () => {
		expect(() => splitLineIntoArguments(`print "amogus sussy" and "a eea '`)).toThrow();
	});
});

describe("splitLineOnSemicolons", () => {
	it("should not split lines without a semicolon", () => {
		expect(splitLineOnSemicolons("set z 98")).toEqual(["set z 98"]);
	});
	it("should split lines on a semicolon", () => {
		expect(splitLineIntoArguments(`print "amogus sussy" and "a eea "`)).toEqual(["print", `"amogus sussy"`, "and", `"a eea "`]);
	});
	it("should not split lines on semicolons within strings", () => {
		expect(() => splitLineIntoArguments(`print "amogus sussy" and "a eea '`)).toThrow();
	});
});

//#endregion
//#region argBasedLineManipulation

describe("transformVariables", () => {
	it("should only edit variables", () => {
		expect(transformVariables(["set", "x", "5"], commands["set"][0], x => `_transformed_${x}`)).toEqual(["set", "_transformed_x", "5"]);
		expect(transformVariables(["print", "x"], commands["print"][0], x => `_transformed_${x}`)).toEqual(["print", "_transformed_x"]);
		expect(transformVariables(["ulocate", "building", "core", "true", "outX", "outY", "found", "building"], commands["ulocate"][3], x => `_transformed_${x}`)).toEqual(["ulocate", "building", "core", "true", "_transformed_outX", "_transformed_outY", "_transformed_found", "_transformed_building"]);
	});
});

describe("transformCommand", () => {
	it("should accept a custom function", () => {
		expect(transformCommand(
			["set", "x", "5"],
			commands["set"][0],
			x => x.toUpperCase(),
			(arg, commandArg) => !(commandArg?.isGeneric ?? true))
		).toEqual(["set", "x", "5"]);
		expect(transformCommand(
			["ulocate", "building", "core", "true", "outX", "outY", "found", "building"],
			commands["ulocate"][3],
			x => x.toUpperCase(),
			(arg, commandArg) => !(commandArg?.isGeneric ?? true))
		).toEqual(["ulocate", "BUILDING", "core", "true", "outX", "outY", "found", "building"]);
		expect(transformCommand(
			["jump", "5", "lessThan", "x", "4"],
			commands["jump"][1],
			(arg:string) => `jump_${arg}_`,
			(arg:string, carg:Arg) => carg.isGeneric && carg.type == "jumpAddress"
		)).toEqual(["jump", "jump_5_", "lessThan", "x", "4"]);
	});
});

describe("addNamespacesToVariable", () => {
	it("should add namespaces to a variable", () => {
		expect(addNamespacesToVariable(
			"x",
			[makeNamespaceEl("amogus")]
		)).toEqual("_amogus_x");
		expect(addNamespacesToVariable(
			"sussyBaka",
			[makeNamespaceEl("amogus"), makeNamespaceEl("sus")]
		)).toEqual("_amogus_sus_sussyBaka");
	});
});

describe("addNamespacesToLine", () => {
	it("should add namespaces to a statement", () => {
		expect(addNamespacesToLine(
			["set", "x", "5"],
			commands["set"][0],
			[makeNamespaceEl("amogus")]
		)).toEqual("set _amogus_x 5");
		expect(addNamespacesToLine(
			["ulocate", "building", "core", "true", "outX", "outY", "found", "core"],
			commands["ulocate"][3],
			[makeNamespaceEl("amogus")]
		)).toEqual("ulocate building core true _amogus_outX _amogus_outY _amogus_found _amogus_core");
		expect(addNamespacesToLine(
			["set", "x", ":number", "5"],
			commands["set"][1],
			[makeNamespaceEl("amogus"), makeNamespaceEl("sus")]
		)).toEqual("set _amogus_sus_x :number 5");
	});
});

describe("prependFilenameToArg", () => {
	it("should prepend filename for an arg with two underscores before it", () => {
		expect(prependFilenameToArg("__thing", false, "test.mlogx")).toEqual("__test__thing");
	});
	it("should not prepend filename for an arg without two underscores before it", () => {
		expect(prependFilenameToArg("_thing", false, "test.mlogx")).toEqual("_thing");
	});
});

describe("removeUnusedJumps", () => {
	it("should not remove used jumps", () => {
		expect(removeUnusedJumps(addSourcesToCode([
			"label5:",
			"jump label5 always"
		]), {
			label5: [{
				line: makeLine("jump label5 always")
			}]
		})).toEqual(addSourcesToCode([
			"label5:",
			"jump label5 always"
		]));
	});
	it("should remove unused jumps", () => {
		expect(removeUnusedJumps(addSourcesToCode([
			"label5:",
			"jump label5 always",
			"label6:"
		]), {
			label5: [{
				line: makeLine("jump label5 always")
			}]
		})).toEqual(addSourcesToCode([
			"label5:",
			"jump label5 always"
		]));
	});
});

//#endregion
//#region parsing

describe("parseIcons", () => {
	it("should parse icons", () => {
		expect(parseIcons([
			`63734=craters|block-craters-ui`
		]).get("_craters")).toEqual(
			String.fromCodePoint(63734)
		);
	});
});

describe("getParameters", () => {
	it("should get function parameters from a program", () => {
		expect(getParameters(["#function move_unit_precise(dest.x:number, u:unit)"]))
			.toEqual([["dest.x", "number"], ["u", "unit"]]);
		expect(getParameters(["#sussy amogus"]))
			.toEqual([]);
	});
});

describe("parsePreprocessorDirectives", () => {
	it("should parse required vars from a program", () => {
		expect(parsePreprocessorDirectives([
			`#require cookie`
		])[1]).toEqual(["cookie"]);
		expect(parsePreprocessorDirectives([
			`#require core, thing`,
			`#sussy baka`,
			`set x false`,
			`#required that stuff be done`
		])[1]).toEqual(["core", "thing"]);
		expect(parsePreprocessorDirectives([
			`#require cookie`
		])[1]).toEqual(["cookie"]);
	});
	it("should parse author from a program", () => {
		expect(parsePreprocessorDirectives([
			`#author amogus`
		])[2]).toEqual("amogus");
		expect(parsePreprocessorDirectives([
			`#author sussy baka`,
			`#sussy baka`,
			`set x false`,
			`#required that stuff be done`
		])[2]).toEqual("sussy baka");
	});
	it("should parse program type from a program", () => {
		expect(parsePreprocessorDirectives([
			`#program_type main`
		])[0]).toEqual("main");
		expect(parsePreprocessorDirectives([
			`#sussy baka`,
			`#program_type main`,
			`set x false`,
			`#required that stuff be done`
		])[0]).toEqual("main");
	});
});

//#endregion
//#region typeReading

describe("getVariablesDefined", () => {
	it("should get variables defined in statements", () => {
		expect(getVariablesDefined(["x", "cell1", "4"], commands["read"][0])).toEqual([["x", "number"]]);
		expect(getVariablesDefined(["building", "core", "true", "outX", "outY", "found", "building"], commands["ulocate"][3]))
			.toEqual([["outX", "number"], ["outY", "number"], ["found", "boolean"], ["building", "building"]]);
	});
	it("should infer type in a set statement", () => {
		expect(getVariablesDefined(["core", "nucleus1"], commands["set"][0])).toEqual([["core", "building"]]);
		expect(getVariablesDefined(["amogus", `"sus"`], commands["set"][0])).toEqual([["amogus", "string"]]);
	});
	it("should accept type hints in a set statement", () => {
		expect(getVariablesDefined(
			["thing", "null"], commands["set"][0],
			["thing", ":building", "null"], commands["set"][1])
		).toEqual([["thing", "building"]]);
		expect(getVariablesDefined(
			["amogus", `otherVar`], commands["set"][0],
			["amogus", ":number", `otherVar`], commands["set"][1]
		)).toEqual([["amogus", "number"]]);
	});
	it("should fail on invalid set statement type hints", () => {
		expect(() => {
			getVariablesDefined(
				["amogus", `otherVar`], commands["set"][0],
				["amogus", ":sus", `otherVar`], commands["set"][1]
			);
		}).toThrow();
	});
});

describe("getVariablesUsed", () => {
	it("should get variables used by a statement", () => {
		expect(getVariablesUsed(["x", "cell1", "y"], commands["read"][0])).toEqual([["y", "number"]]);
		expect(getVariablesUsed(["building", "core", "true", "outX", "outY", "found", "building"], commands["ulocate"][3]))
			.toEqual([]);
	});
});

describe("getAllPossibleVariablesUsed", () => {
	it("should get variables used by a statement", () => {
		expect(getAllPossibleVariablesUsed("read x cell1 y")).toEqual([["y", ["number"]]]);
		expect(getAllPossibleVariablesUsed("ucontrol within x y 10 close"))
			.toEqual([["x", ["number"]], ["y", ["number"]]]);
		expect(getAllPossibleVariablesUsed("ulocate building core true outX outY found building"))
			.toEqual([]);
	});
	it("should return multiple possible types for certain commands", () => {
		expect(getAllPossibleVariablesUsed("sensor x thing @x"))
			.toEqual([["thing", ["building", "unit"]]]);
	});
	it("should work for commands that replace", () => {
		expect(getAllPossibleVariablesUsed("sensor building.x building @x", "sensor building.x"))
			.toEqual([["building", ["building", "unit"]]]);
	});
});

describe("getJumpLabelUsed", () => {
	it("should get the jump label used", () => {
		expect(getJumpLabelUsed("jump label always")).toEqual("label");
	});
	it("should return null if no jump label exists", () => {
		expect(getJumpLabelUsed("set label \"greaterThan\"")).toEqual(null);
	});
});

describe("getJumpLabel", () => {
	it("should get the jump label defined", () => {
		expect(getJumpLabel("label:")).toEqual("label");
	});
	it("should return null if no jump label exists", () => {
		expect(getJumpLabel("jump label greaterThan x 5")).toEqual(null);
	});
});

//#endregion
//#region stack

describe("hasElement", () => {
	it("should return whether or not the stack contains an &for loop", () => {
		expect(hasElement([
			makeNamespaceEl("amogus"), makeNamespaceEl("sus")
		], "&for")).toEqual(false);
		expect(hasElement([], "&for")).toEqual(false);
		expect(hasElement([
			makeNamespaceEl("amogus"), makeForEl("I", range(0, 5, true))
		], "&for")).toEqual(true);
		expect(hasElement([
			makeNamespaceEl("amogus"),
			makeForEl("I", range(0, 5, true)),
			makeForEl("J", range(3, 10, true))
		], "&for")).toEqual(true);
	});
	it("should return whether or not the stack contains a namespace", () => {
		expect(hasElement([
			makeNamespaceEl("amogus"), makeForEl("I", range(0, 5, true))
		], "namespace")).toEqual(true);
		expect(hasElement([
			makeForEl("I", range(0, 5, true)),
			makeForEl("J", range(3, 10, true))
		], "namespace")).toEqual(false);
		expect(hasElement([], "namespace")).toEqual(false);
	});
	it("should return whether or not the stack contains an if statement", () => {
		expect(hasElement([
			makeNamespaceEl("amogus"), makeForEl("I", range(0, 5, true)), makeIfEl(false)
		], "&if")).toEqual(true);
		expect(hasElement([
			makeForEl("I", range(0, 5, true)),
			makeForEl("J", range(3, 10, true))
		], "&if")).toEqual(false);
		expect(hasElement([], "&if")).toEqual(false);
	});
});

describe("topForLoop", () => {
	it("should return the topmost &for loop on the stack", () => {
		expect(topForLoop([
			makeNamespaceEl("amogus"), makeForEl("I", range(0, 5, true))
		])).toEqual(makeForEl("I", range(0, 5, true)));
		expect(topForLoop([
			makeNamespaceEl("amogus"),
			makeForEl("I", range(0, 5, true)),
			makeForEl("J", range(3, 10, true))
		])).toEqual(makeForEl("J", range(3, 10, true)));
	});
	it("should return null when no &for loop is on the stack", () => {
		expect(topForLoop([
			makeNamespaceEl("amogus")
		])).toEqual(null);
	});
});

//#endregion
//#region commandChecking

describe("getCommandDefinitions", () => {
	it("should get all valid command definitions for a command", () => {
		expect(getCommandDefinitions(`read x cell1 4`)).toEqual([
			commands.read[0]
		]);
		expect(getCommandDefinitions(`ulocate building core true outX outY found core`)).toEqual([
			commands.ulocate[3]
		]);
		expect(getCommandDefinitions(`sensor x thing @x`)).toEqual([
			commands.sensor[0], commands.sensor[1]
		]);
		expect(getCommandDefinitions(`print x`)).toEqual([
			commands.print[0]
		]);
	});
	it("should return errors if specified", () => {
		expect(getCommandDefinitions(`amogus`, true)).toEqual([
			[],
			[commandErrOfType("noCommand")]
		]);
		expect(getCommandDefinitions(`jump label always`, true)).toEqual([
			[commands.jump[0]],
			[commandErrOfType("argumentCount"), commandErrOfType("argumentCount"), commandErrOfType("argumentCount")]
		]);
		expect(getCommandDefinitions(`lookup amogus output 3`, true)).toEqual([
			[],
			[commandErrOfType("badStructure"), commandErrOfType("badStructure"), commandErrOfType("badStructure"), commandErrOfType("badStructure")]
		]);
		expect(getCommandDefinitions(`drawflush 5`, true)).toEqual([
			[],
			[commandErrOfType("type")]
		]);
	});
	it("should return empty if no valid definitions", () => {
		expect(getCommandDefinitions(`amogus`)).toEqual([]);
		expect(getCommandDefinitions(`print sussy baka`)).toEqual([]);
		expect(getCommandDefinitions(`drawflush 5`)).toEqual([]);
		expect(getCommandDefinitions(`ulocate ore @this outX outY found`)).toEqual([]);
	});
});

describe("getCommandDefinition", () => {
	it("should get the first valid command definition for a command", () => {
		expect(getCommandDefinition(`read x cell1 4`))
			.toEqual(commands.read[0]);
		expect(getCommandDefinition(`ulocate building core true outX outY found core`))
			.toEqual(commands.ulocate[3]);
	});
});

describe("isCommand", () => {
	it("should check if a command is valid for a command definition", () => {
		expect(isCommand(`set x 5`, commands.set[0]))
			.toEqual([true, null]);
		expect(isCommand(`set x :number 5`, commands.set[1]))
			.toEqual([true, null]);
		expect(isCommand(`set x 5`, commands.set[1]))
			.toEqual([false, commandErrOfType("argumentCount")]);
		expect(isCommand(`set x :number 5`, commands.set[0]))
			.toEqual([false, commandErrOfType("argumentCount")]);
		expect(isCommand(`ulocate or3 @copper ore.x ore.y ore.found`, commands.ulocate[0]))
			.toEqual([false, commandErrOfType("badStructure")]);
	});
});

describe("getCompilerCommandDefinitions", () => {
	it("should get all valid compiler command definitions for a statement", () => {
		expect(getCompilerCommandDefinitions("&if x {"))
			.toEqual([
				[compilerCommands["&if"].overloads[0]],
				[]
			]);
		expect(getCompilerCommandDefinitions("&for x in 0 5 {"))
			.toEqual([
				[compilerCommands["&for"].overloads[0]],
				[commandErrOfType("badStructure")]
			]);
		expect(getCompilerCommandDefinitions("&for x of a b c d f {"))
			.toEqual([
				[compilerCommands["&for"].overloads[1]],
				[commandErrOfType("argumentCount")]
			]);
		expect(getCompilerCommandDefinitions("namespace amogus {"))
			.toEqual([
				[compilerCommands["namespace"].overloads[0]],
				[]
			]);
	});
	it("should return errors if a command is invalid", () => {
		expect(getCompilerCommandDefinitions("&for x in sussybakas {"))
			.toEqual([
				[],
				[commandErrOfType("argumentCount"), commandErrOfType("badStructure")]
			]);
		expect(getCompilerCommandDefinitions("&for x in 0 5 e"))
			.toEqual([
				[],
				[commandErrOfType("badStructure"), commandErrOfType("badStructure")]
			]);
		expect(getCompilerCommandDefinitions(`namespace @unit {`))
			.toEqual([
				[],
				[commandErrOfType("type")]
			]);
		expect(getCompilerCommandDefinitions("set x 5"))
			.toEqual([
				[],
				[commandErrOfType("noCommand")]
			]);
	});
});

//#endregion
//#region typeChecking
describe("typeIsAccepted", () => {
	it("should return true if types are the same", () => {
		expect(typeIsAccepted("number", "number"))
			.toEqual(true);
		expect(typeIsAccepted("operandSingle", "operandSingle"))
			.toEqual(true);
	});
	it("should return true if types are compatible", () => {
		expect(typeIsAccepted("boolean", "number"))
			.toEqual(true);
		expect(typeIsAccepted("any", "jumpAddress"))
			.toEqual(true);
		expect(typeIsAccepted("unit", "any"))
			.toEqual(true);
		expect(typeIsAccepted("itemType", "senseable"))
			.toEqual(true);
	});
	it("should return false if types are incompatible", () => {
		expect(typeIsAccepted("number", "string"))
			.toEqual(false);
		expect(typeIsAccepted("operandSingle", "ctype"))
			.toEqual(false);
		expect(typeIsAccepted("number", "boolean"))
			.toEqual(true);
	});
});

describe("areAnyOfInputsAcceptedByType", () => {
	it("should return true if types are the same", () => {
		expect(areAnyOfInputsAcceptedByType(["number"], "number"))
			.toEqual(true);
		expect(areAnyOfInputsAcceptedByType(["building", "type", "number"], "number"))
			.toEqual(true);
	});
	it("should return true if types are compatible", () => {
		expect(areAnyOfInputsAcceptedByType(["boolean"], "number"))
			.toEqual(true);
		expect(areAnyOfInputsAcceptedByType(["any", "operandTest"], "number"))
			.toEqual(true);
		expect(areAnyOfInputsAcceptedByType(["itemType"], "senseable"))
			.toEqual(true);
	});
	it("should return false if types are incompatible", () => {
		expect(areAnyOfInputsAcceptedByType(["building", "type"], "number"))
			.toEqual(false);
		expect(areAnyOfInputsAcceptedByType(["jumpAddress", "unit"], "boolean"))
			.toEqual(false);
		expect(areAnyOfInputsAcceptedByType(["senseable"], "itemType"))
			.toEqual(false);
	});
});

describe("isInputAcceptedByAnyType", () => {
	it("should return true if types are the same", () => {
		expect(isInputAcceptedByAnyType("number", ["number"]))
			.toEqual(true);
		expect(isInputAcceptedByAnyType("number", ["building", "type", "number"]))
			.toEqual(true);
	});
	it("should return true if types are compatible", () => {
		expect(isInputAcceptedByAnyType("number", ["boolean"]))
			.toEqual(true);
		expect(isInputAcceptedByAnyType("boolean", ["number"]))
			.toEqual(true);
		expect(isInputAcceptedByAnyType("number", ["any", "operandTest"]))
			.toEqual(true);
		expect(isInputAcceptedByAnyType("itemType", ["senseable"]))
			.toEqual(true);
	});
	it("should return false if types are incompatible", () => {
		expect(isInputAcceptedByAnyType("number", ["building", "type"]))
			.toEqual(false);
		expect(isInputAcceptedByAnyType("boolean", ["jumpAddress", "unit"]))
			.toEqual(false);
		expect(isInputAcceptedByAnyType("senseable", ["itemType"]))
			.toEqual(false);
	});
});

describe("acceptsVariable", () => {
	it("should determine if an Arg accepts a variable as an input", () => {
		expect(acceptsVariable(makeArg("unit", "target", true, true, false)))
			.toEqual(true);
		expect(acceptsVariable(makeArg("number", "target", true, true, false)))
			.toEqual(true);
		expect(acceptsVariable(makeArg("unit", "target", true, true, true)))
			.toEqual(false);
		expect(acceptsVariable(makeArg("buildingGroup", "thing", true, true, false)))
			.toEqual(false);
		expect(acceptsVariable(makeArg("ctype", "thing", true, true, false)))
			.toEqual(false);
		expect(acceptsVariable(makeArg("unitSortCriteria", "thing", true, true, false)))
			.toEqual(false);
	});
});

//#endregion
//#region misc

describe("arg", () => {
	it("should parse non-generic args", () => {
		expect(arg(`amogus`)).toEqual(makeArg("amogus", "amogus", false, false, false, false));
		expect(arg(`zero:0?`)).toEqual(makeArg("0", "zero", true, false, false, false));
	});
	it("should parse args with types", () => {
		expect(arg(`amogus:number`)).toEqual(makeArg("number", "amogus", false, true, false, false));
	});
	it("should parse optional args", () => {
		expect(arg(`amogus:string?`)).toEqual(makeArg("string", "amogus", true, true, false, false));
	});
	it("should parse variable output args", () => {
		expect(arg(`amogus:*number`)).toEqual(makeArg("number", "amogus", false, true, true, false));
	});
	it("should parse spread args", () => {
		expect(arg(`...amogus:number`)).toEqual(makeArg("number", "amogus", false, true, false, true));
	});
});

describe("processCommands", () => {
	it("should process the commands ast", () => {
		
		expect(processCommands({
			"amogus": [{
				args: "sus susLevel:number",
				description: "Sets the suslevel of the imposter."
			}],
			"sus": [
				{
					args: "building buildingGroup:buildingGroup enemy:boolean outX:*number outY:*number found:*boolean building:*building",
					description: "is sus.",
					replace: ["sus building %2 %3 _ %4 %5 %6 %7"],
					port(args) {
						return args.join(" ");
					},
				},{
					args: "",
					description: "Does nothing."
				}
			],
		})).toEqual({
			"amogus": [{
				type: "Command",
				args: [makeArg("sus", "sus", false, false, false), makeArg("number", "susLevel", false, true, false)],
				description: "Sets the suslevel of the imposter.",
				name: "amogus",
				getVariablesDefined: undefined,
				getVariablesUsed: undefined,
				port: undefined
			}],
			"sus": [
				{
					type: "Command",
					name: "sus",
					description: "is sus.",
					args: [
						makeArg("building", "building", false, false, false),
						makeArg("buildingGroup", "buildingGroup", false, true, false),
						makeArg("boolean", "enemy", false, true, false),
						makeArg("number", "outX", false, true, true),
						makeArg("number", "outY", false, true, true),
						makeArg("boolean", "found", false, true, true),
						makeArg("building", "building", false, true, true),
					],
					getVariablesDefined: undefined,
					getVariablesUsed: undefined,
					replace: jasmine.any(Function),
					port: jasmine.any(Function)
				},{
					type: "Command",
					args: [],
					description: "Does nothing.",
					name: "sus",
					getVariablesDefined: undefined,
					getVariablesUsed: undefined,
					port: undefined
				}
			]
		});

	});
});

describe("addSourcesToCode", () => {
	it("should add sources to code", () => {
		expect(addSourcesToCode([
			`print "hello"`,
			`printflush message1`,
			`//sussy baka`
		], makeLine(`print "hello"`, 420, "amogus.mlogx"), makeLine(`print "hello"`, 420, "amogus.mlogx"))).toEqual([
			[`print "hello"`, makeLine(`print "hello"`, 420, "amogus.mlogx"), makeLine(`print "hello"`, 420, "amogus.mlogx")],
			[`printflush message1`, makeLine(`print "hello"`, 420, "amogus.mlogx"), makeLine(`print "hello"`, 420, "amogus.mlogx")],
			[`//sussy baka`, makeLine(`print "hello"`, 420, "amogus.mlogx"), makeLine(`print "hello"`, 420, "amogus.mlogx")],
		]);
	});
});

//#endregion
